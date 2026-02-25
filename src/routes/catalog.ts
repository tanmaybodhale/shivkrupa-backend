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

router.post('/seed', async (req: Request, res: Response): Promise<void> => {
  try {
    const products = [
      { name: 'Classmate Notebook A4 (200 pg)', category: 'stationery', price: 65, mrp: 80, image: 'https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=300', unit: 'piece', inStock: true, isNew: false, tag: 'bestseller' },
      { name: 'Reynolds 045 Pens (Pack of 10)', category: 'stationery', price: 45, mrp: 55, image: 'https://images.unsplash.com/photo-1585336261022-680e295ce3fe?w=300', unit: 'pack', inStock: true, isNew: false, tag: '' },
      { name: 'Stapler Set with Pins', category: 'stationery', price: 120, mrp: 150, image: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=300', unit: 'set', inStock: true, isNew: false, tag: '' },
      { name: "Lay's Chips Mix (Combo 3)", category: 'snacks', price: 60, mrp: 75, image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300', unit: 'combo', inStock: true, isNew: false, tag: 'popular' },
      { name: 'Cadbury Dairy Milk (4 bars)', category: 'snacks', price: 120, mrp: 150, image: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300', unit: 'pack', inStock: true, isNew: false, tag: 'bestseller' },
      { name: 'Kurkure Masala Munch', category: 'snacks', price: 30, mrp: 35, image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=300', unit: 'piece', inStock: true, isNew: false, tag: '' },
      { name: 'Gift Hamper – Sweet & Stationery', category: 'gifts', price: 350, mrp: 450, image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=300', unit: 'hamper', inStock: true, isNew: false, tag: 'premium' },
      { name: 'Greeting Card Set (12 pcs)', category: 'gifts', price: 75, mrp: 100, image: 'https://images.unsplash.com/photo-1533216761760-e42a3e75a5c0?w=300', unit: 'set', inStock: true, isNew: false, tag: '' },
      { name: 'Silver Anklet Pair', category: 'jewellery', price: 220, mrp: 300, image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=300', unit: 'pair', inStock: true, isNew: false, tag: '' },
      { name: 'Gold-Plated Jhumka Earrings', category: 'jewellery', price: 280, mrp: 350, image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300', unit: 'pair', inStock: true, isNew: false, tag: 'bestseller' },
      { name: 'Stainless Steel Lunch Box Set', category: 'cutlery', price: 240, mrp: 320, image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=300', unit: 'set', inStock: true, isNew: false, tag: 'premium' },
      { name: 'Spoon & Fork Set (6+6)', category: 'cutlery', price: 185, mrp: 250, image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=300', unit: 'set', inStock: true, isNew: false, tag: '' },
      { name: 'Photocopy A4 (per page)', category: 'xerox', price: 2, mrp: 2, image: 'https://images.unsplash.com/photo-1568656012931-c7d4a19c5b9d?w=300', unit: 'page', inStock: true, isNew: false, tag: '' },
      { name: 'Colour Print A4 (per page)', category: 'xerox', price: 10, mrp: 10, image: 'https://images.unsplash.com/photo-1568656012931-c7d4a19c5b9d?w=300', unit: 'page', inStock: true, isNew: false, tag: '' },
      { name: 'Lakme Nail Colour Set', category: 'cosmetics', price: 145, mrp: 180, image: 'https://images.unsplash.com/photo-1585123366869-0ea7e8d4b11b?w=300', unit: 'set', inStock: true, isNew: false, tag: '' },
      { name: 'Face Pack Combo (3 types)', category: 'cosmetics', price: 110, mrp: 150, image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300', unit: 'combo', inStock: true, isNew: true, tag: '' },
      { name: 'Jute Shopping Bag', category: 'bags', price: 90, mrp: 120, image: 'https://images.unsplash.com/photo-1597633425046-08f5110420b5?w=300', unit: 'piece', inStock: true, isNew: false, tag: 'eco' },
      { name: 'Pencil Pouch – Printed', category: 'bags', price: 75, mrp: 100, image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=300', unit: 'piece', inStock: true, isNew: true, tag: '' },
      { name: 'Puzzle Set 100 Pieces', category: 'toys', price: 120, mrp: 150, image: 'https://images.unsplash.com/photo-1494059980473-813e73ee784b?w=300', unit: 'set', inStock: true, isNew: false, tag: '' },
      { name: 'Fidget Spinner Premium', category: 'toys', price: 50, mrp: 80, image: 'https://images.unsplash.com/photo-1614720623159-559a8f957a1f?w=300', unit: 'piece', inStock: true, isNew: false, tag: '' },
      { name: 'Phenyl Floor Cleaner 1L', category: 'household', price: 75, mrp: 90, image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=300', unit: 'bottle', inStock: true, isNew: false, tag: '' },
      { name: 'Incense Sticks Assorted Box', category: 'household', price: 55, mrp: 70, image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300', unit: 'box', inStock: true, isNew: false, tag: 'popular' },
    ];

    await Product.deleteMany({});
    const created = await Product.insertMany(products);
    res.json({ success: true, message: `Seeded ${created.length} products`, products: created });
  } catch (error) {
    console.error('Seed products error:', error);
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
