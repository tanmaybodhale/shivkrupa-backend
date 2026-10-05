import { Router, Request, Response } from 'express';
import Banner from '../models/Banner';

const router = Router();

// GET / — customers only see active banners, sorted for the slideshow.
// Admin passes ?admin=true to see everything (including inactive) for management.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.query.admin === 'true';
    const filter = isAdmin ? {} : { active: true };
    const banners = await Banner.find(filter).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, banners });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { image, link, title, order, active } = req.body;
    if (!image) {
      res.status(400).json({ success: false, message: 'Image is required' });
      return;
    }
    const banner = new Banner({
      image,
      link: link || '',
      title: title || '',
      order: typeof order === 'number' ? order : 0,
      active: active !== false,
    });
    await banner.save();
    res.status(201).json({ success: true, banner });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const banner = await Banner.findByIdAndUpdate(id, updates, { new: true });
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner not found' });
      return;
    }
    res.json({ success: true, banner });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByIdAndDelete(id);
    if (!banner) {
      res.status(404).json({ success: false, message: 'Banner not found' });
      return;
    }
    res.json({ success: true, message: 'Banner deleted' });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
