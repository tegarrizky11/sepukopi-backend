require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();

// Mengambil variabel dari .env
const PORT = process.env.PORT || 5000; 
const mongoUri = process.env.MONGO_URI;

// ===========================================
// 1. KONFIGURASI CORS (UNTUK HOSTING)
// ===========================================
// Tambahkan URL Vercel Anda di sini setelah deploy
const allowedOrigins = [
    'http://localhost:5173', 
    'http://localhost:3000',
    // 'https://nama-proyek-anda.vercel.app' // Nanti buka komentar ini & ganti URL-nya
];

app.use(cors({
    origin: function (origin, callback) {
        // Izinkan request tanpa origin (seperti mobile apps atau Postman)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
            callback(null, true);
        } else {
            callback(new Error('Akses diblokir oleh kebijakan CORS'));
        }
    },
    credentials: true
}));

app.use(express.json()); 

// ===========================================
// 2. IMPORT & PASANG ROUTES
// ===========================================
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes'); 
const saleRoutes = require('./routes/saleRoutes');
const transactionRoutes = require('./routes/transactionRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/transactions', transactionRoutes);

// Rute Dasar (Testing saat deploy)
app.get('/', (req, res) => {
    res.json({ 
        status: 'Server Active', 
        message: 'Sepukopi POS API is Running Successfully' 
    });
});

// ===========================================
// 3. PENANGANAN ERROR GLOBAL
// ===========================================
app.use((err, req, res, next) => {
    console.error('Error Stack:', err.stack); 
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error'
    });
});

// ===========================================
// 4. KONEKSI MONGODB & START SERVER
// ===========================================
mongoose.set('strictQuery', false); // Menghindari warning di versi Mongoose terbaru

mongoose.connect(mongoUri)
    .then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`🚀 Server online di port: ${PORT}`);
        });
    })
    .catch((err) => {
        console.error('❌ MongoDB Connection Error:', err.message);
        process.exit(1); 
    });