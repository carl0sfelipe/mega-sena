import express from 'express';
import cors from 'cors';
import session from 'express-session';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './config/database.js';

// Import routes
import authRoutes from './routes/auth.js';
import paymentsRoutes from './routes/payments.js';
import numbersRoutes from './routes/numbers.js';
import adminRoutes from './routes/admin.js';
import bolaoRoutes from './routes/bolao.js';

// Load environment variables
dotenv.config();

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../..');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for localhost development
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    sameSite: 'lax'
  }
}));

// Serve static frontend files
app.use(express.static(path.join(projectRoot, 'frontend')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/numbers', numbersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/bolao', bolaoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Catch-all route for frontend (SPA support)
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  res.sendFile(path.join(projectRoot, 'frontend', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { details: err.message })
  });
});

// Start server
async function startServer() {
  console.log('');
  console.log('='.repeat(60));
  console.log('🎲 BOLÃO MEGA DA VIRADA 2026');
  console.log('='.repeat(60));
  console.log('');

  // Test database connection
  console.log('🔌 Testing database connection...');
  const dbConnected = await testConnection();

  if (!dbConnected) {
    console.error('');
    console.error('❌ Failed to connect to database. Please check your configuration.');
    console.error('   Make sure to:');
    console.error('   1. Run the SQL schema in Supabase (backend/schema.sql)');
    console.error('   2. Check your .env file has correct credentials');
    console.error('');
    process.exit(1);
  }

  console.log('');

  // Start listening
  app.listen(PORT, () => {
    console.log('✅ Server started successfully');
    console.log('');
    console.log('📍 Server Information:');
    console.log(`   URL: http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('');
    console.log('📡 Available Endpoints:');
    console.log('   GET  /                           → Frontend (Login page)');
    console.log('   GET  /api/health                 → Health check');
    console.log('   POST /api/auth/login             → Login');
    console.log('   POST /api/auth/logout            → Logout');
    console.log('   GET  /api/auth/me                → Current user');
    console.log('   POST /api/payments/join          → Join bolão');
    console.log('   POST /api/payments/claim-paid    → Claim payment');
    console.log('   GET  /api/payments/status        → Payment status');
    console.log('   GET  /api/numbers/scores         → Get scores');
    console.log('   POST /api/numbers/select         → Select numbers');
    console.log('   GET  /api/numbers/my-selections  → Get selections');
    console.log('   GET  /api/admin/participants     → List participants (admin)');
    console.log('   POST /api/admin/confirm-payment  → Confirm payment (admin)');
    console.log('   GET  /api/admin/totals           → Get totals (admin)');
    console.log('   POST /api/admin/close-bolao      → Close bolão (admin)');
    console.log('   GET  /api/bolao/info             → Bolão info');
    console.log('   GET  /api/bolao/closure          → Closure info');
    console.log('');
    console.log('💡 Next Steps:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Login with your name');
    console.log('   3. Admin user: Carlos');
    console.log('');
    console.log('🚀 Ready to accept connections!');
    console.log('='.repeat(60));
    console.log('');
  });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('');
  console.log('👋 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('');
  console.log('👋 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer().catch(error => {
  console.error('');
  console.error('❌ Fatal error starting server:', error);
  console.error('');
  process.exit(1);
});
