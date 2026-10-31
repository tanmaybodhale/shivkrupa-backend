import { Router, Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import User from '../models/User';
import { sendOrderNotification, sendCancellationNotification } from '../utils/sendOrderNotification';
import { requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';

const router = Router();

// Placing an order needs a verified (OTP) login. Who the customer is comes from
// the login token, never from the request body.
router.post('/', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = (req as AuthedRequest).auth!;
    const { items, subtotal, delivery, total, paymentMethod, deliveryAddress } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ success: false, message: 'Your cart is empty' });
      return;
    }

    const uid = auth.uid;
    let name: string;
    let phone: string;

    if (auth.role === 'customer') {
      const user = await User.findOne({ uid, role: 'customer' });
      if (!user) {
        res.status(401).json({ success: false, message: 'Please login again' });
        return;
      }
      name = user.name;
      phone = user.phone; // the phone number that was verified by OTP
    } else {
      // Shopkeeper placing a test order
      name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim() : 'Shopkeeper';
      phone = typeof req.body.phone === 'string' && req.body.phone.trim() ? req.body.phone.trim() : '9975636622';
    }

    const orderId = 'SKE' + Date.now().toString().slice(-7);
    const now = new Date();
    const timeStr = now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
    const order = new Order({
      orderId,
      uid,
      name,
      phone,
      items,
      subtotal,
      delivery,
      total,
      paymentMethod: paymentMethod || 'cod',
      status: 'pending',
      time: now,
      timeStr,
      deliveryAddress,
    });
    await order.save();
    await sendOrderNotification(order);
    for (const item of items) {
      // Print/Xerox line items use a synthetic productId like
      // "<baseId>-print-<cloudinaryPublicId>" rather than a real catalog
      // product ID, since each uploaded file is its own unique cart line.
      // There's no real stock to adjust for these, and passing a malformed
      // ID into Product.findById() throws a CastError — which, uncaught,
      // used to crash this whole request AFTER the order had already been
      // saved. That meant the order existed in the database (visible to
      // the admin) but the customer's app received a failed response and
      // never cleared the cart or showed the bill. Skipping/guarding here
      // fixes that for good, for print items and for any other bad ID.
      if (item.printDetails) continue;
      try {
        const product = await Product.findById(item.productId);
        if (product && product.quantity !== undefined && product.quantity !== null) {
          const newQty = Math.max(0, product.quantity - item.qty);
          await Product.findByIdAndUpdate(item.productId, { quantity: newQty, inStock: newQty > 0 });
        }
      } catch (err) {
        console.error(`Stock update skipped for item ${item.productId}:`, err);
      }
    }
    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin only: every order in the shop
router.get('/all', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find().sort({ time: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// A customer can read only their own orders (the admin can read anyone's)
router.get('/:uid', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = (req as AuthedRequest).auth!;
    const { uid } = req.params;
    if (uid !== auth.uid && auth.role !== 'shopkeeper') {
      res.status(403).json({ success: false, message: 'Not allowed' });
      return;
    }
    const orders = await Order.find({ uid }).sort({ time: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// The shopkeeper can set any status. A customer can only cancel their own
// order, and only while it is not already delivered or cancelled.
router.put('/:orderId/status', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = (req as AuthedRequest).auth!;
    const { orderId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ orderId });

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (auth.role !== 'shopkeeper') {
      const closed = ['delivered', 'completed', 'cancelled'];
      if (order.uid !== auth.uid || status !== 'cancelled' || closed.includes(order.status)) {
        res.status(403).json({ success: false, message: 'Not allowed' });
        return;
      }
    }

    const previousStatus = order.status;

    if (previousStatus === 'cancelled') {
      res.status(400).json({ success: false, message: 'This order was already cancelled and cannot be updated.' });
      return;
    }

    if (status === 'cancelled') {
      await sendCancellationNotification(order);
      for (const item of order.items) {
        // Same reasoning as above — skip the synthetic print-item IDs so a
        // cancellation can never crash on a bad ObjectId either.
        if (item.printDetails) continue;
        try {
          const product = await Product.findById(item.productId);
          if (product && product.quantity !== undefined && product.quantity !== null) {
            const newQty = product.quantity + item.qty;
            await Product.findByIdAndUpdate(item.productId, { quantity: newQty, inStock: true });
          }
        } catch (err) {
          console.error(`Stock restore skipped for item ${item.productId}:`, err);
        }
      }
    }

    order.status = status;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
