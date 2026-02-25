import { Router, Request, Response } from 'express';
import Order from '../models/Order';
import Product from '../models/Product';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid, name, phone, items, subtotal, delivery, total, paymentMethod } = req.body;
    
    const orderId = 'SKE' + Date.now().toString().slice(-7);
    const now = new Date();
    const timeStr = now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

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
    });

    await order.save();

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product && product.quantity !== undefined && product.quantity !== null) {
        const newQty = Math.max(0, product.quantity - item.qty);
        await Product.findByIdAndUpdate(item.productId, { quantity: newQty, inStock: newQty > 0 });
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
    
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product && product.quantity !== undefined && product.quantity !== null) {
          const newQty = product.quantity + item.qty;
          await Product.findByIdAndUpdate(item.productId, { quantity: newQty, inStock: true });
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
