const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
    product_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price_per_unit: { type: Number, required: true }, 
    cost_per_unit: { type: Number, required: true }, // Untuk menyimpan HPP saat transaksi terjadi
    total_price: { type: Number, required: true }, 
});

const SaleSchema = new mongoose.Schema({
    total_amount: { type: Number, required: true }, // Total Harga Jual
    total_cost: { type: Number, required: true },   // Total Modal (HPP) untuk transaksi ini
    payment_method: { type: String, enum: ['Cash', 'Debit', 'QRIS'], default: 'Cash' },
    cashier_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    transaction_date: { type: Date, default: Date.now },
    items: [SaleItemSchema],
    status: { type: String, enum: ['Completed', 'Canceled'], default: 'Completed' },
}, { timestamps: true });

module.exports = mongoose.model('Sale', SaleSchema);