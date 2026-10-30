import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import User, { IUser } from '../models/User';
import Order from '../models/Order';
import { firebaseAuth } from '../config/firebase';
import { signSession, requireAuth, requireAdmin, AuthedRequest } from '../middleware/auth';

const router = Router();

const USER_PUBLIC_FIELDS = 'uid name phone email role joinedAt address addresses wishlist';
const SHOPKEEPER_PHONE = '9975636622';

// ── helpers ─────────────────────────────────────────────────
const limiter = (limit: number) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again later.' },
  });

const otpLimiter = limiter(20);
const adminLimiter = limiter(10);

const publicUser = (u: IUser) => ({
  uid: u.uid,
  name: u.name,
  phone: u.phone,
  email: u.email,
  role: u.role,
  address: u.address,
  wishlist: u.wishlist || [],
});

const uidOf = (req: Request): string => (req as AuthedRequest).auth!.uid;

const safeEqual = (a: string, b: string): boolean => {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
};

function checkShopkeeper(id: string, password: string): boolean {
  const username = process.env.SHOPKEEPER_USERNAME;
  const pass = process.env.SHOPKEEPER_PASSWORD;
  if (!username || !pass) {
    console.error('SHOPKEEPER_USERNAME / SHOPKEEPER_PASSWORD env vars are not set');
    return false;
  }
  return (safeEqual(id, username) || id === SHOPKEEPER_PHONE) && safeEqual(password, pass);
}

const shopkeeperUser = (name: string) => ({
  uid: 'SHOP001',
  name,
  phone: SHOPKEEPER_PHONE,
  role: 'shopkeeper' as const,
});

// Returns the 10-digit phone from a verified Firebase ID token, or null
async function phoneFromIdToken(idToken: string): Promise<string | null> {
  const decoded = await firebaseAuth().verifyIdToken(idToken);
  const fresh = Date.now() / 1000 - decoded.auth_time < 300; // OTP verified within last 5 min
  const viaPhone = decoded.firebase?.sign_in_provider === 'phone';
  const full = decoded.phone_number || '';
  if (!fresh || !viaPhone || !/^\+91\d{10}$/.test(full)) return null;
  return full.slice(3);
}

// ── OTP auth ────────────────────────────────────────────────

// Lets the UI avoid sending an SMS to a wrong or unregistered number
router.post('/check-phone', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!/^\d{10}$/.test(phone || '')) {
      res.status(400).json({ success: false, message: 'Enter a valid 10-digit phone number' });
      return;
    }
    const exists = !!(await User.exists({ phone }));
    res.json({ success: true, exists });
  } catch (error) {
    console.error('check-phone error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/signup-otp', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, name, email } = req.body;
    if (!idToken || typeof name !== 'string' || !name.trim()) {
      res.status(400).json({ success: false, message: 'Name and OTP verification required' });
      return;
    }

    let phone: string | null = null;
    try {
      phone = await phoneFromIdToken(idToken);
    } catch {
      phone = null;
    }
    if (!phone) {
      res.status(401).json({ success: false, message: 'Phone verification failed' });
      return;
    }

    if (await User.exists({ phone })) {
      res.status(409).json({ success: false, message: 'This number is already registered. Please login.' });
      return;
    }

    const user = await User.create({
      uid: 'SKE' + Date.now().toString().slice(-6),
      name: name.trim(),
      phone,
      email: typeof email === 'string' && email.trim() ? email.trim() : undefined,
      role: 'customer', // never taken from the client
      joinedAt: new Date(),
      address: {},
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: publicUser(user),
      token: signSession({ uid: user.uid, role: 'customer' }),
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      res.status(409).json({ success: false, message: 'This number is already registered. Please login.' });
      return;
    }
    console.error('signup-otp error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

router.post('/login-otp', otpLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    let phone: string | null = null;
    try {
      phone = await phoneFromIdToken(req.body.idToken);
    } catch {
      phone = null;
    }
    if (!phone) {
      res.status(401).json({ success: false, message: 'Phone verification failed' });
      return;
    }

    const user = await User.findOne({ phone, role: 'customer' });
    if (!user) {
      res.status(404).json({ success: false, message: 'This number is not registered. Please sign up first.' });
      return;
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: publicUser(user),
      token: signSession({ uid: user.uid, role: 'customer' }),
    });
  } catch (error) {
    console.error('login-otp error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// ── Shopkeeper (password) login ─────────────────────────────

router.post('/login', adminLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, password, role } = req.body;

    if (role !== 'shopkeeper') {
      res.status(400).json({ success: false, message: 'Customers sign in with an OTP on the login page' });
      return;
    }
    if (!id || !password) {
      res.status(400).json({ success: false, message: 'Please provide username and password' });
      return;
    }
    if (!checkShopkeeper(String(id), String(password))) {
      res.status(401).json({ success: false, message: 'Invalid shopkeeper credentials' });
      return;
    }

    const user = shopkeeperUser('Shopkeeper');
    res.json({
      success: true,
      message: 'Login successful',
      user,
      token: signSession({ uid: user.uid, role: 'shopkeeper' }),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

router.post('/admin-login', adminLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Please provide username and password' });
      return;
    }
    if (!checkShopkeeper(String(username), String(password))) {
      res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      return;
    }

    const user = shopkeeperUser('Admin');
    res.json({
      success: true,
      message: 'Admin login successful',
      user,
      token: signSession({ uid: user.uid, role: 'shopkeeper' }),
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
});

// ── Admin only ──────────────────────────────────────────────

router.get('/users', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find({ role: 'customer' })
      .select(USER_PUBLIC_FIELDS)
      .sort({ joinedAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/users/:uid', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { uid } = req.params;
    if (!uid) {
      res.status(400).json({ success: false, message: 'User ID required' });
      return;
    }

    const user = await User.findOneAndDelete({ uid, role: 'customer' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    await Order.deleteMany({ uid });

    res.json({ success: true, message: 'User removed from platform' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ── Logged-in customer (uid always comes from the token) ────

router.put('/profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = uidOf(req);
    const { name, address } = req.body;
    const updates: Record<string, unknown> = {};

    if (typeof name === 'string') {
      const trimmedName = name.trim();
      if (!trimmedName) {
        res.status(400).json({ success: false, message: 'Name cannot be empty' });
        return;
      }
      updates.name = trimmedName;
    }

    if (address && typeof address === 'object') {
      updates.address = address;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ success: false, message: 'No valid profile fields provided' });
      return;
    }

    const user = await User.findOneAndUpdate(
      { uid, role: 'customer' },
      updates,
      { new: true }
    ).select(USER_PUBLIC_FIELDS);

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/address', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { address } = req.body;
    if (!address || typeof address !== 'object') {
      res.status(400).json({ success: false, message: 'Address required' });
      return;
    }
    const user = await User.findOneAndUpdate(
      { uid: uidOf(req), role: 'customer' },
      { address },
      { new: true }
    ).select(USER_PUBLIC_FIELDS);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add or replace an address in the addresses array
router.put('/addresses', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = uidOf(req);
    const { address, index } = req.body;
    if (!address || typeof address !== 'object') {
      res.status(400).json({ success: false, message: 'Address required' });
      return;
    }
    const user = await User.findOne({ uid, role: 'customer' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!user.addresses) user.addresses = [];
    if (typeof index === 'number' && index >= 0 && index < user.addresses.length) {
      user.addresses[index] = address;
    } else {
      user.addresses.push(address);
    }
    if (!user.address) user.address = address;
    await user.save();
    const updated = await User.findOne({ uid }).select(USER_PUBLIC_FIELDS);
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update addresses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete an address from addresses array
router.delete('/addresses', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = uidOf(req);
    const { index } = req.body;
    if (typeof index !== 'number') {
      res.status(400).json({ success: false, message: 'index required' });
      return;
    }
    const user = await User.findOne({ uid, role: 'customer' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (user.addresses && index >= 0 && index < user.addresses.length) {
      user.addresses.splice(index, 1);
      await user.save();
    }
    const updated = await User.findOne({ uid }).select(USER_PUBLIC_FIELDS);
    res.json({ success: true, user: updated });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Toggle wishlist: add if not present, remove if already in list
router.post('/wishlist/toggle', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = uidOf(req);
    const { productId } = req.body;
    if (!productId || typeof productId !== 'string') {
      res.status(400).json({ success: false, message: 'productId required' });
      return;
    }
    const user = await User.findOne({ uid, role: 'customer' });
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    if (!user.wishlist) user.wishlist = [];
    const idx = user.wishlist.indexOf(productId);
    if (idx === -1) {
      user.wishlist.push(productId);
    } else {
      user.wishlist.splice(idx, 1);
    }
    await user.save();
    res.json({ success: true, wishlist: user.wishlist || [], added: idx === -1 });
  } catch (error) {
    console.error('Wishlist toggle error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Wishlist product IDs (a customer can read only their own)
router.get('/wishlist/:uid', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const auth = (req as AuthedRequest).auth!;
    if (req.params.uid !== auth.uid && auth.role !== 'shopkeeper') {
      res.status(403).json({ success: false, message: 'Not allowed' });
      return;
    }
    const user = await User.findOne({ uid: req.params.uid }).select('wishlist');
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.json({ success: true, wishlist: user.wishlist || [] });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
