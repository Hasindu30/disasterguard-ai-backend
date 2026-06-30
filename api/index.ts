import type { VercelRequest, VercelResponse } from '@vercel/node';
import app, { connectDB } from '../src/server';

// Ensure MongoDB is connected before handling each request
export default async function handler(req: VercelRequest, res: VercelResponse) {
  await connectDB();
  return app(req as any, res as any);
}
