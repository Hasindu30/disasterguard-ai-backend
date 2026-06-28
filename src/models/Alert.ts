import { Schema, model } from 'mongoose';
import { IAlert } from '../types';

const AlertSchema = new Schema<IAlert>(
  {
    riskReportId: {
      type: Schema.Types.ObjectId,
      ref: 'RiskReport',
      required: false,
    },
    message: {
      type: String,
      required: true,
    },
    locationName: {
      type: String,
      required: true,
      trim: true,
    },
    riskLevel: {
      type: String,
      enum: ['Low Risk', 'Medium Risk', 'High Risk'],
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Only need createdAt as per database models req
  }
);

export default model<IAlert>('Alert', AlertSchema);
