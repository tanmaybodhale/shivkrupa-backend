import { Router, Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';
import { sendOrderNotification, sendCancellationNotification } from '../utils/sendOrderNotification';
const router = Router();
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, name, phone, items, subtotal, delivery, total, paymentMethod, deliveryAddress } = req.body;
    
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
router.get('/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find().sort({ time: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.get('/:uid', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    const orders = await Order.find({ uid }).sort({ time: -1 });
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
router.put('/:orderId/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findOne({ orderId });
    
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    const previousStatus = order.status;

    if (previousStatus === 'cancelled') {
      res.status(400).json({ success: false, message: 'This order was already cancelled and cannot be updated.' });
      return;
    }
    
    if (status === 'cancelled' ) {
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
