require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

/* =========================
   BASIC CONFIG
========================= */
const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI TIDAK ADA');
  process.exit(1);
}

/* =========================
   CORS CONFIG
========================= */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://sepukopi.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS blocked'));
  },
  credentials: true
}));

app.use(express.json());

/* =========================
   HEALTH CHECK (PENTING)
========================= */
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

/* =========================
   ROUTES
========================= */
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const saleRoutes = require('./routes/saleRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/transactions', transactionRoutes);

/* =========================
   ROOT TEST
========================= */
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'Server Active',
    message: 'Sepukopi POS API is Running Successfully'
  });
});

/* =========================
   404 HANDLER (PENTING)
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} tidak ditemukan`
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error('🔥 ERROR:', err.message);
  res.status(500).json({
    success: false,
    message: err.message
  });
});

/* =========================
   DB CONNECT & START
========================= */
mongoose.set('strictQuery', false);

mongoose.connect(mongoUri)
  .then(() => {
    console.log('✅ MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB Error:', err.message);
    process.exit(1);
  });
