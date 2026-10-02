import { Router, Request, Response } from 'express';
import Service from '../models/Service';

const router = Router();

// GET all — storefront only sees active services. Admin passes ?admin=true
// to see everything, same convention as /catalog.
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const isAdmin = req.query.admin === 'true';
    const filter = isAdmin ? {} : { active: true };
    const services = await Service.find(filter).sort({ createdAt: 1 });
    res.json({ success: true, services });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET single service by key (e.g. /services/xerox)
router.get('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = await Service.findOne({ key: req.params.key.toLowerCase() });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST — create a new service (admin)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { key, name, icon, pricing, active } = req.body;
    if (!key || !name) {
      res.status(400).json({ success: false, message: 'key and name are required' });
      return;
    }

    const normalizedKey = String(key).toLowerCase().trim();
    const existing = await Service.findOne({ key: normalizedKey });
    if (existing) {
      res.status(409).json({ success: false, message: `A service with key "${normalizedKey}" already exists` });
      return;
    }

    const service = new Service({
      key: normalizedKey,
      name,
      icon: icon || '🛠️',
      pricing: pricing || {},
      active: active !== false,
    });
    await service.save();
    res.status(201).json({ success: true, service });
  } catch (error) {
    console.error('Create service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT — update a service by key (pricing, name, icon, active)
router.put('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = { ...req.body };
    delete updates.key; // key is immutable once created

    const service = await Service.findOneAndUpdate(
      { key: req.params.key.toLowerCase() },
      updates,
      { new: true }
    );
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }
    res.json({ success: true, service });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// DELETE a service by key
router.delete('/:key', async (req: Request, res: Response): Promise<void> => {
  try {
    const service = await Service.findOneAndDelete({ key: req.params.key.toLowerCase() });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
