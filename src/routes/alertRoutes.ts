import { Router, Request, Response } from 'express';
import Alert from '../models/Alert';
import { protect, admin } from '../middleware/auth';

const router = Router();

// @desc    Get all alerts
// @route   GET /api/alerts
// @access  Public
router.get('/', async (req: Request, res: Response) => {
  try {
    const alerts = await Alert.find({}).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error: any) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ message: 'Server error fetching alerts', error: error.message });
  }
});

// @desc    Create manual alert (Admin only)
// @route   POST /api/alerts
// @access  Private/Admin
router.post('/', protect, admin, async (req: Request, res: Response) => {
  try {
    const { message, locationName, riskLevel } = req.body;

    if (!message || !locationName || !riskLevel) {
      return res.status(400).json({ message: 'Please provide message, locationName, and riskLevel' });
    }

    if (!['Low Risk', 'Medium Risk', 'High Risk'].includes(riskLevel)) {
      return res.status(400).json({ message: 'Invalid riskLevel. Must be Low Risk, Medium Risk, or High Risk' });
    }

    const alert = await Alert.create({
      message,
      locationName,
      riskLevel
    });

    res.status(201).json(alert);
  } catch (error: any) {
    console.error('Manual alert creation error:', error);
    res.status(500).json({ message: 'Server error creating manual alert', error: error.message });
  }
});

// @desc    Delete alert (Admin only)
// @route   DELETE /api/alerts/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req: Request, res: Response) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    await alert.deleteOne();
    res.json({ message: 'Alert removed successfully' });
  } catch (error: any) {
    console.error('Alert delete error:', error);
    res.status(500).json({ message: 'Server error deleting alert', error: error.message });
  }
});

export default router;
