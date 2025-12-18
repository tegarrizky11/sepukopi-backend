// routes/transactionRoutes.js

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth'); 

// --- DESTRUCTURING: Pastikan semua fungsi diekstrak dari controller ---
const {
    createTransaction, 
    getSummary, 
    getAllTransactions, 
    cancelTransaction,
    saveDraft,       
    getDrafts,       
    checkoutDraft,
    generateQris    // <<< FITUR BARU: GENERATE QRIS
} = require('../controllers/transactionController'); 
// --------------------------------------------------------

// POST /api/transactions : Mencatat penjualan baru (Checkout)
router.post('/', protect, authorize('admin', 'kasir'), createTransaction); 

// GET /api/transactions/summary : Laporan Penjualan (Admin Only)
router.get('/summary', protect, authorize('admin'), getSummary); 

// GET /api/transactions : Mendapatkan semua riwayat transaksi
router.get('/', protect, authorize('admin'), getAllTransactions); 

// DELETE /api/transactions/:id : Membatalkan Transaksi (Refund)
router.delete('/:id', protect, authorize('admin'), cancelTransaction); 

// --- RUTE DRAFT / HOLD ORDER ---

// POST /api/transactions/drafts : Menyimpan pesanan sebagai draft
router.post('/drafts', protect, authorize('admin', 'kasir'), saveDraft); 

// GET /api/transactions/drafts : Mengambil semua pesanan draft
router.get('/drafts', protect, authorize('admin', 'kasir'), getDrafts); 

// PUT /api/transactions/drafts/:id : Checkout Draft (mengubah status menjadi completed)
router.put('/drafts/:id', protect, authorize('admin', 'kasir'), checkoutDraft); 

// --- RUTE PEMBAYARAN QRIS ---
// GET /api/transactions/qris/:id : Menghasilkan QR code untuk pembayaran
router.get('/qris/:id', protect, authorize('admin', 'kasir'), generateQris); // <<< RUTE BARU QRIS

module.exports = router;