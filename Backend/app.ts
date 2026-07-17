import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api';
import { connectDB } from './config/db';

const app = express();

// 1. CORS and Security Headers Middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

// 2. Parse JSON and URL-encoded bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. DB connection middleware removed (handled in server.ts)

// 4. Mount Backend API Routes
app.use('/api/v1', apiRouter);

// 5. Centralized Error Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).setHeader('Content-Type', 'application/json').json({ error: 'Internal Server Error', message: err.message });
});

export default app;
