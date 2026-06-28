import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes';
import riskRoutes from './routes/riskRoutes';
import alertRoutes from './routes/alertRoutes';
import resourceRoutes from './routes/resourceRoutes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/disasterguard';

// Enable CORS
app.use(
  cors({
    origin: '*', // Allow all origins for simplicity in MVP, can narrow in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Body parser
app.use(express.json());

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/resources', resourceRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// Database connection & Server initialization
console.log('Connecting to MongoDB...');
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected Successfully.');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.log('Starting express server in offline-database mode...');
    
    // Fallback starting the server even if DB fails, so that API calls can still be tested/mocked
    app.listen(PORT, () => {
      console.log(`Server running in offline-database mode on port ${PORT}`);
    });
  });
