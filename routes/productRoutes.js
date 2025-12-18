// server/routes/productRoutes.js (VERSI TERKONSOLIDASI DAN TERPROTEKSI)

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth'); 
const { seedProducts } = require('../controllers/productController');

// Catatan: Semua rute di bawah ini secara default adalah /api/products

// Rute GET: Mengambil semua produk
// Endpoint: GET /api/products
// Kebutuhan: Harus login (protect) dan harus memiliki role 'admin' atau 'kasir' (authorize)
router.get('/', protect, authorize('admin', 'kasir'), productController.getAllProducts);

// Rute GET: Mengambil produk dengan stok rendah (Hanya untuk Admin)
// Endpoint: GET /api/products/lowstock
// Kebutuhan: Harus login (protect) dan harus memiliki role 'admin'
router.get('/lowstock', protect, authorize('admin'), productController.getLowStockProducts);

// Rute POST: Membuat produk baru (Hanya untuk Admin)
// Endpoint: POST /api/products
// Kebutuhan: Harus login (protect) dan harus memiliki role 'admin'
router.post('/', protect, authorize('admin'), productController.createProduct);

// Rute PUT: Mengubah produk berdasarkan ID (Hanya untuk Admin)
// Endpoint: PUT /api/products/:id
router.put('/:id', protect, authorize('admin'), productController.updateProduct);

// Rute DELETE: Menonaktifkan produk (Hanya untuk Admin)
// Endpoint: DELETE /api/products/:id
router.delete('/:id', protect, authorize('admin'), productController.deleteProduct);

// Tambahkan route POST ini jika belum ada, atau jika Anda belum memasukkannya ke dalam array router
router.post('/seed', seedProducts);


// Opsional: Jika Anda memiliki endpoint tanpa ID
router.put('/:id', protect, productController.updateProduct);
// router.get('/', productController.getSomethingElse); 

module.exports = router;