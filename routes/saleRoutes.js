const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');
const { protect, authorize } = require('../middleware/auth'); 

// Pastikan urutan dan nama fungsi saleController.xxxx sama dengan di atas
router.get('/stats', protect, authorize('admin'), saleController.getStats);
router.get('/report/monthly', protect, authorize('admin'), saleController.getMonthlyReport);
router.get('/report/detailed', protect, authorize('admin'), saleController.getDetailedReport);

router.post('/', protect, authorize('admin', 'kasir'), saleController.createSale);
router.get('/', protect, authorize('admin', 'kasir'), saleController.getSales);

module.exports = router;