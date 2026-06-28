import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'USER' | 'ADMIN';
  resetTempPassword?: string | null;
  createdAt: Date;

  updatedAt: Date;
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface IRiskReport extends Document {
  userId?: Types.ObjectId;
  locationName: string;
  latitude: number;
  longitude: number;
  rainfall: number;
  windSpeed: number;
  temperature: number;
  floodHistory: number;
  lowElevation: number;
  riskScore: number;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  recommendation: string;
  createdAt: Date;
}

export interface IAlert extends Document {
  riskReportId?: Types.ObjectId;
  message: string;
  locationName: string;
  riskLevel: 'Low Risk' | 'Medium Risk' | 'High Risk';
  createdAt: Date;
}

// Request type overrides
declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
