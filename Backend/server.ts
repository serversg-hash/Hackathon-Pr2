import dotenv from 'dotenv';
// Load environment variables early
dotenv.config();

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import app from './app';
import { connectDB } from './config/db';

async function startServer() {
  await connectDB();
  const PORT = 3000;

  // Vite Middleware for Development / Static serving for Production
  if (process.env.NODE_ENV !== 'production') {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), 'dist');
    // Serve static files from the build directory
    app.use(express.static(distPath));
    
    // Serve index.html as a fallback for any client-side routing
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start Listening
  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`MaintainIQ full-stack server running at http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical error starting MaintainIQ server:", err);
});

