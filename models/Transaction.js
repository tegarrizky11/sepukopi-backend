// models/Transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Referensi ke user yang melakukan transaksi (Kasir/Admin)
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Detail barang yang dijual
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price_at_sale: { // Harga jual saat produk terjual
            type: Number,
            required: true
        },
        // >>> TAMBAHKAN FIELD HPP PER UNIT DI SINI <<<
        cost_at_sale: { // Biaya pokok (HPP) per unit saat produk terjual
            type: Number,
            required: true,
            default: 0
        }
    }],
    total_amount: { // Total yang harus dibayar (Total Revenue)
        type: Number,
        required: true
    },
    // >>> TAMBAHKAN FIELD TOTAL HPP DI SINI <<<
    total_cost: { // Total Biaya Pokok Penjualan (Total HPP)
        type: Number,
        required: true,
        default: 0
    },
    payment_method: {
        type: String,
        enum: ['cash', 'debit', 'credit'],
        default: 'cash'
    },
    status: {
        type: String,
        enum: ['completed', 'canceled'],
        default: 'completed'
    },
    status: {
    type: String,
    enum: ['completed', 'canceled', 'draft'], // <<< TAMBAHKAN 'draft' DI SINI
    default: 'completed'
},
}, {
    timestamps: true
});

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;