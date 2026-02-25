import { Router, Request, Response } from 'express';
import User from '../models/User';

const router = Router();

router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, phone, email, password, role } = req.body;

    if (!name || !phone || !password) {
      res.status(400).json({ success: false, message: 'Please fill all required fields' });
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      res.status(400).json({ success: false, message: 'Enter a valid 10-digit phone number' });
      return;
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      res.status(400).json({ success: false, message: 'Phone already registered' });
      return;
    }

    const uid = 'SKE' + Date.now().toString().slice(-6);
    const userRole = role || 'customer';

    const newUser = new User({
      uid,
      name,
      phone,
      email: email || undefined,
      password,
      role: userRole,
      joinedAt: new Date(),
    });

    await newUser.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        uid: newUser.uid,
        name: newUser.name,
        phone: newUser.phone,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Server error during signup' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, password, role } = req.body;

    if (!id || !password || !role) {
      res.status(400).json({ success: false, message: 'Please provide id, password and role' });
      return;
    }

    // Shopkeeper login (hardcoded)
    if (role === 'shopkeeper') {
      const shopkeeperUsername = process.env.SHOPKEEPER_USERNAME || 'admin';
      const shopkeeperPassword = process.env.SHOPKEEPER_PASSWORD || 'admin123';

      if ((id === shopkeeperUsername || id === '9975636622') && password === shopkeeperPassword) {
        res.json({
          success: true,
          message: 'Login successful',
          user: {
            uid: 'SHOP001',
            name: 'Shopkeeper',
            phone: '9975636622',
            role: 'shopkeeper',
          },
        });
        return;
      }

      res.status(401).json({ success: false, message: 'Invalid shopkeeper credentials' });
      return;
    }

    // Customer login
    const user = await User.findOne({
      $or: [{ phone: id }, { email: id }],
    });

    if (!user) {
      res.status(401).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Wrong password' });
      return;
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        uid: user.uid,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

router.post('/admin-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, message: 'Please provide username and password' });
      return;
    }

    const shopkeeperUsername = process.env.SHOPKEEPER_USERNAME || 'admin';
    const shopkeeperPassword = process.env.SHOPKEEPER_PASSWORD || 'admin123';

    if (username === shopkeeperUsername && password === shopkeeperPassword) {
      res.json({
        success: true,
        message: 'Admin login successful',
        user: {
          uid: 'SHOP001',
          name: 'Admin',
          phone: '9975636622',
          role: 'shopkeeper',
        },
      });
      return;
    }

    res.status(401).json({ success: false, message: 'Invalid admin credentials' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error during admin login' });
  }
});

export default router;
