import { Router, Request, Response } from 'express';
import Product from '../models/Product';
import Order from '../models/Order';

const router = Router();

// GET all — customers only see non-hidden products
// Admin can pass ?admin=true to see all
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.query.admin === 'true';
    const filter = isAdmin ? {} : { hidden: { $ne: true } };
    const products = await Product.find(filter).sort({ createdAt: -1 });
    // Cache for 30s on client, 60s on shared caches (CDN/proxy)
    if (!isAdmin) res.set('Cache-Control', 'public, max-age=30, s-maxage=60');
    res.json({ success: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single product by ID (for /product/[id] page — always returns regardless of hidden)
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }
    res.json({ success: true, product });
  } catch (error) {
    console.error('Get single product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET related/suggested products for a given product ID
// Ranks by co-purchase frequency from past orders, falls back to same category
router.get('/:id/related', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const limit = 8;

    const product = await Product.findById(id);
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    // 1) Find all orders that included this product
    const ordersWithProduct = await Order.find({ 'items.productId': id }).select('items');

    // 2) Count co-occurrence of every other productId in those same orders
    const coPurchaseCounts: Record<string, number> = {};
    for (const order of ordersWithProduct) {
      for (const item of order.items) {
        if (item.productId === id) continue;
        coPurchaseCounts[item.productId] = (coPurchaseCounts[item.productId] || 0) + 1;
      }
    }

    // 3) Sort co-purchased product IDs by frequency, most-bought-together first
    const rankedCoPurchaseIds = Object.entries(coPurchaseCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([productId]) => productId);

    // Fetch those products (only if still in-stock and not hidden)
    const coPurchaseProducts = rankedCoPurchaseIds.length > 0
      ? await Product.find({
          _id: { $in: rankedCoPurchaseIds },
          hidden: { $ne: true },
          inStock: { $ne: false },
        })
      : [];

    // Preserve the ranked order (Mongo doesn't guarantee $in order)
    const coPurchaseMap = new Map(coPurchaseProducts.map(p => [String(p._id), p]));
    const rankedProducts = rankedCoPurchaseIds
      .map(pid => coPurchaseMap.get(pid))
      .filter(Boolean) as typeof coPurchaseProducts;

    let related = rankedProducts.slice(0, limit);

    // 4) Fill remaining slots with same-category products, if needed
    if (related.length < limit) {
      const excludeIds = [id, ...related.map(p => String(p._id))];
      const categoryFallback = await Product.find({
        category: product.category,
        _id: { $nin: excludeIds },
        hidden: { $ne: true },
        inStock: { $ne: false },
      })
        .sort({ createdAt: -1 })
        .limit(limit - related.length);

      related = [...related, ...categoryFallback];
    }

    res.json({ success: true, products: related });
  } catch (error) {
    console.error('Get related products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, category, subCategory, brand, price, mrp, description, weight, image, images, unit, inStock, isNew, tag } = req.body;

    const product = new Product({
      name,
      category,
      subCategory: subCategory || '',
      brand: brand || '',
      price,
      mrp,
      description,
      weight,
      image: image || 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300',
      images: images || [],
      unit: unit || 'piece',
      inStock: inStock !== false,
      isNew: isNew || false,
      tag: tag || '',
      hidden: false,
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

// PATCH /:id/hidden — toggle hidden flag (admin only in practice)
router.patch('/:id/hidden', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { hidden } = req.body as { hidden: boolean };

    const product = await Product.findByIdAndUpdate(
      id,
      { hidden: !!hidden },
      { new: true }
    );
    if (!product) {
      res.status(404).json({ success: false, message: 'Product not found' });
      return;
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Toggle hidden error:', error);
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
