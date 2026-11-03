import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from './index';

let mongoMemoryServer: MongoMemoryServer | null = null;

export const connectDatabase = async (): Promise<string> => {
  try {
    let uri = config.mongoUri;

    if (!uri) {
      console.log('⚡ No MONGODB_URI provided. Initializing embedded MongoMemoryServer for development...');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: 'zerolock',
        },
      });
      uri = mongoMemoryServer.getUri();
      console.log(`✓ Embedded MongoDB instance running at: ${uri}`);
    } else {
      console.log(`⚡ Connecting to configured MongoDB instance...`);
    }

    await mongoose.connect(uri);
    console.log('✓ Successfully connected to MongoDB Database');
    return uri;
  } catch (error) {
    console.error('✗ MongoDB connection error:', error);
    // If external URI failed, attempt embedded fallback
    if (config.mongoUri && !mongoMemoryServer) {
      console.log('⚡ Attempting fallback to embedded MongoMemoryServer...');
      mongoMemoryServer = await MongoMemoryServer.create({
        instance: { dbName: 'zerolock' },
      });
      const fallbackUri = mongoMemoryServer.getUri();
      await mongoose.connect(fallbackUri);
      console.log(`✓ Fallback embedded MongoDB connected at: ${fallbackUri}`);
      return fallbackUri;
    }
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    if (mongoMemoryServer) {
      await mongoMemoryServer.stop();
      mongoMemoryServer = null;
    }
    console.log('✓ Disconnected from MongoDB');
  } catch (error) {
    console.error('✗ Error disconnecting from MongoDB:', error);
  }
};
