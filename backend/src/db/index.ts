import mongoose from 'mongoose';

/**
 * Establishes a connection to MongoDB.
 * Throws if MONGODB_URI is not defined in environment.
 */
export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined in environment variables');

  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');
}

/**
 * Gracefully closes the MongoDB connection.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}
