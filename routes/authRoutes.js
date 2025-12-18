const express = require('express');
const router = express.Router();
const { 
    registerUser, 
    loginUser, 
    registerKasir, 
    getAllKasir 
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth'); 

// 1. Rute Registrasi Umum (Admin Pertama Kali)
router.post('/register', registerUser);

// 2. Rute Login (Admin & Kasir)
router.post('/login', loginUser);

// 3. Rute Khusus Admin: Mendaftarkan Kasir Baru (TERPROTEKSI)
router.post('/register-kasir', protect, authorize('admin'), registerKasir);

// 4. Rute Khusus Admin: Melihat Daftar Semua Kasir (TERPROTEKSI)
router.get('/kasir-list', protect, authorize('admin'), getAllKasir);

module.exports = router;