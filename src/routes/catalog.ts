import { Router, Request, Response } from 'express';
import Product from '../models/Product';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, price, mrp, description, image, unit, inStock, isNew, tag } = req.body;

    const product = new Product({
      name,
      category,
      price,
      mrp,
      description,
      image: image || 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300',
      unit: unit || 'piece',
      inStock: inStock !== false,
      isNew: isNew || false,
      tag: tag || '',
    });

    await product.save();
    res.status(201).json({ success: true, product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const product = await Product.findByIdAndUpdate(id, updates, { new: true });
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/clear', async (req: Request, res: Response): Promise<void> => {
  try {
    await Product.deleteMany({});
    res.json({ success: true, message: 'All products deleted' });
  } catch (error) {
    console.error('Clear products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
