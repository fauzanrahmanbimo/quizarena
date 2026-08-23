const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const healthRoute = require('./routes/health');
const authRoutes = require('./routes/auth');
const questionRoutes = require('./routes/questions');
const historyRoutes = require('./routes/history');
const progressRoutes = require('./routes/progress');

const app = express();

// 1. CORS Setup
const allowedOrigins = process.env.FRONTEND_ORIGINS 
  ? process.env.FRONTEND_ORIGINS.split(',').map(o => o.trim()) 
  : ['http://localhost:3000', 'https://quizarena-nu.vercel.app'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// 2. Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Terlalu banyak permintaan, coba lagi nanti.' },
  standardHeaders: true,
  legacyHeaders: false,
});
// Apply global limiter to API routes but we can apply specific ones later
app.use('/health', healthRoute);

app.use('/api/', globalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/progress', progressRoutes);

// General error handler to avoid leaking stack traces
app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan internal.' });
});

module.exports = app;
