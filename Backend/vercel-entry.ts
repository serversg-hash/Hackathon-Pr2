import dotenv from 'dotenv';
dotenv.config();

import { app } from './app.js';
import { connectDB } from './config/db.js';

// DB connection
try {
  await connectDB();
  console.log("Database connection initialized successfully");
} catch (err) {
  console.error("Critical error initializing database in vercel-entry:", err);
}

// Export the Express app for Vercel
export default app;
