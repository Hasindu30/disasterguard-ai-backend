import { Schema, model } from 'mongoose';
import { IRiskReport } from '../types';

const RiskReportSchema = new Schema<IRiskReport>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    rainfall: {
      type: Number,
      required: true,
    },
    windSpeed: {
      type: Number,
      required: true,
    },
    temperature: {
      type: Number,
      required: true,
    },
    floodHistory: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    lowElevation: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    riskScore: {
      type: Number,
      required: true,
    },
    riskLevel: {
      type: String,
      enum: ['Low Risk', 'Medium Risk', 'High Risk'],
      required: true,
    },
    recommendation: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need createdAt as per database models req
  }
);

export default model<IRiskReport>('RiskReport', RiskReportSchema);
