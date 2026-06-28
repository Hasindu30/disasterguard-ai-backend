import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User';
import { protect } from '../middleware/auth';

const router = Router();

// Configure Nodemailer transporter (Uses Ethereal/Mailtrap/Gmail SMTP)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'fakeuser@ethereal.email',
    pass: process.env.SMTP_PASS || 'fakepass123',
  },
});


const generateToken = (id: string): string => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'supersecretkey12345!@#',
    { expiresIn: '30d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // If first user, make them ADMIN for testing convenience
    const isFirstUser = (await User.countDocuments({})) === 0;
    const finalRole = isFirstUser ? 'ADMIN' : (role === 'ADMIN' ? 'ADMIN' : 'USER');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: finalRole,
    });

    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check for user email
    const user = await User.findOne({ email }).select('+password');

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      _id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    });
  } catch (error: any) {
    console.error('Profile retrieval error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Request temporary password reset code
// @route   POST /api/auth/forgot-password/request
// @access  Public
router.post('/forgot-password/request', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please enter your email address' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email' });
    }

    // Generate random 8-character temporary password
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Update user record with temporary password
    user.resetTempPassword = tempPassword;
    await user.save();

    // Setup email message details
    const mailOptions = {
      from: process.env.SMTP_FROM || '"DisasterGuard AI" <noreply@disasterguard.org>',
      to: email,
      subject: 'Temporary Password Reset Code - DisasterGuard AI',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #ef4444; text-align: center;">DisasterGuard AI Password Recovery</h2>
          <p>Hello,</p>
          <p>You requested a password reset for your DisasterGuard account. Please use the following system-generated temporary password to verify your account and set a new password:</p>
          <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #ea580c; margin: 20px 0;">
            ${tempPassword}
          </div>
          <p style="color: #64748b; font-size: 12px; text-align: center;">This temporary password is valid for 30 minutes. If you did not make this request, you can safely ignore this email.</p>
        </div>
      `
    };

    // We now skip backend SMTP sending since the frontend will dispatch it via EmailJS
    console.log(`[API] Temporary Password generated for ${email}: ${tempPassword}`);

    res.json({
      message: 'Temporary password generated for frontend dispatch.',
      tempPassword: tempPassword // Exposing this so the frontend can send it via EmailJS
    });
  } catch (error: any) {

    console.error('Forgot password request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Verify temporary password
// @route   POST /api/auth/forgot-password/verify
// @access  Public
router.post('/forgot-password/verify', async (req: Request, res: Response) => {
  try {
    const { email, tempPassword } = req.body;
    if (!email || !tempPassword) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetTempPassword || user.resetTempPassword !== tempPassword) {
      return res.status(400).json({ message: 'Invalid temporary password code' });
    }

    res.json({ message: 'Temporary password verified successfully' });
  } catch (error: any) {
    console.error('Forgot password verification error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @desc    Reset password after verifying temporary code
// @route   POST /api/auth/forgot-password/reset
// @access  Public
router.post('/forgot-password/reset', async (req: Request, res: Response) => {
  try {
    const { email, tempPassword, newPassword } = req.body;
    if (!email || !tempPassword || !newPassword) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetTempPassword || user.resetTempPassword !== tempPassword) {
      return res.status(400).json({ message: 'Invalid or expired temporary session' });
    }

    // Set new password
    user.password = newPassword;
    user.resetTempPassword = null; // Clear temp password
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('Password reset update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;

