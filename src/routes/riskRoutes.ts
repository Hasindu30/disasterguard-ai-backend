import { Router, Request, Response } from 'express';
import axios from 'axios';
import RiskReport from '../models/RiskReport';
import Alert from '../models/Alert';
import { protect, admin } from '../middleware/auth';

const router = Router();

// @desc    Calculate disaster risk score for a location
// @route   POST /api/risk/calculate
// @access  Private
router.post('/calculate', protect, async (req: Request, res: Response) => {
  try {
    const { latitude, longitude, locationName, floodHistory = 0, lowElevation = 0 } = req.body;

    if (!latitude || !longitude || !locationName) {
      return res.status(400).json({ message: 'Please provide location name, latitude, and longitude' });
    }

    // Parse inputs to float / numbers
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const fHistory = Math.min(10, Math.max(0, parseFloat(floodHistory)));
    const lElevation = Math.min(10, Math.max(0, parseFloat(lowElevation)));

    // Fetch weather data from Open-Meteo API
    // Using current weather variables: temperature, wind speed, rain, weather code
    // Added daily variables for future rain prediction
    const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,rain,wind_speed_10m,weather_code&daily=precipitation_sum,precipitation_probability_max&timezone=auto`;
    
    let weatherData = {
      temperature: 0,
      rain: 0,
      windSpeed: 0,
      weatherCode: 0
    };
    
    let forecastData: any[] = [];

    try {
      const response = await axios.get(openMeteoUrl);
      if (response.data && response.data.current) {
        const cur = response.data.current;
        weatherData = {
          temperature: cur.temperature_2m ?? 0,
          rain: cur.rain ?? cur.precipitation ?? 0,
          windSpeed: cur.wind_speed_10m ?? 0,
          weatherCode: cur.weather_code ?? 0
        };
      }
      if (response.data && response.data.daily) {
        const daily = response.data.daily;
        // Get next 3 days forecast (index 1, 2, 3)
        for (let i = 1; i <= 3; i++) {
          if (daily.time[i]) {
            forecastData.push({
              date: daily.time[i],
              rainSum: daily.precipitation_sum[i] ?? 0,
              rainProb: daily.precipitation_probability_max[i] ?? 0
            });
          }
        }
      }
    } catch (apiErr: any) {
      console.error('Open-Meteo API request failed, using default weather values:', apiErr.message);
      // We will fallback to 0 values rather than breaking the service
    }

    const { rain, windSpeed, temperature } = weatherData;

    // Normalizing inputs to cap values for standard scoring:
    // Capping rainfall at 100mm, wind speed at 100km/h
    const normalizedRain = Math.min(100, Math.max(0, rain));
    const normalizedWind = Math.min(100, Math.max(0, windSpeed));

    // Scaling floodHistory (0-10) and lowElevation (0-10) by 10 to place them on a 0-100 scale.
    // Score formula: riskScore = rain*0.4 + wind*0.2 + floodHistory*10*0.25 + lowElevation*10*0.15
    const rainPart = normalizedRain * 0.4;
    const windPart = normalizedWind * 0.2;
    const floodPart = (fHistory * 10) * 0.25;
    const elevationPart = (lElevation * 10) * 0.15;

    const rawScore = rainPart + windPart + floodPart + elevationPart;
    const riskScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    // Risk levels:
    // 0–39 = Low Risk
    // 40–69 = Medium Risk
    // 70–100 = High Risk
    let riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk' = 'Low Risk';
    let recommendation = '';

    if (riskScore >= 70) {
      riskLevel = 'High Risk';
      recommendation = `High danger! Relocate to higher ground if you are in a low-lying area. Evacuate immediately if instructed by emergency authorities. Avoid all non-essential travel, pack emergency documents, and keep power banks, flashlights, and medical kits accessible.`;
    } else if (riskScore >= 40) {
      riskLevel = 'Medium Risk';
      recommendation = `Moderate risk detected. Secure outdoor objects that could be blown away by heavy winds. Avoid driving or walking through flooded roads. Keep monitoring emergency channels, store clean drinking water, and prepare a basic emergency grab-bag.`;
    } else {
      riskLevel = 'Low Risk';
      recommendation = `Stable conditions. No immediate weather hazards detected. General safety guidelines apply: stay updated on regional forecasts and ensure gutters and drainage systems are clear.`;
    }

    // Save the risk report
    const riskReport = await RiskReport.create({
      userId: req.user?._id,
      locationName,
      latitude: lat,
      longitude: lon,
      rainfall: rain,
      windSpeed,
      temperature,
      floodHistory: fHistory,
      lowElevation: lElevation,
      riskScore,
      riskLevel,
      recommendation
    });

    // Generate alerts if risk is Medium or High
    if (riskLevel === 'Medium Risk' || riskLevel === 'High Risk') {
      let alertMsg = '';
      if (riskLevel === 'High Risk') {
        alertMsg = `CRITICAL ALERT: High flood and storm risk detected in ${locationName} (Risk Score: ${riskScore}/100) due to heavy rainfall (${rain} mm) and high wind speeds (${windSpeed} km/h). Avoid low-lying roads, clear drain channels, and prepare for evacuation if necessary.`;
      } else {
        alertMsg = `WARNING: Moderate risk of flooding/storms detected in ${locationName} (Risk Score: ${riskScore}/100) due to elevated weather metrics. Stay cautious on waterlogged streets and secure loose items.`;
      }

      await Alert.create({
        riskReportId: riskReport._id,
        message: alertMsg,
        locationName,
        riskLevel
      });
    }

    // Return the report object along with the temporary forecast data array
    res.status(201).json({
      ...riskReport.toObject(),
      forecast: forecastData
    });
  } catch (error: any) {
    console.error('Risk calculation error:', error);
    res.status(500).json({ message: 'Server error during risk calculation', error: error.message });
  }
});

// @desc    Get risk reports history for current user
// @route   GET /api/risk/history
// @access  Private
router.get('/history', protect, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const reports = await RiskReport.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (error: any) {
    console.error('History fetch error:', error);
    res.status(500).json({ message: 'Server error fetching risk history', error: error.message });
  }
});

// @desc    Get all risk reports (Admin only)
// @route   GET /api/risk/all
// @access  Private/Admin
router.get('/all', protect, admin, async (req: Request, res: Response) => {
  try {
    const reports = await RiskReport.find({})
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(reports);
  } catch (error: any) {
    console.error('All reports fetch error:', error);
    res.status(500).json({ message: 'Server error fetching all reports', error: error.message });
  }
});

export default router;
