// models/Product.js

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    sku: { // Stock Keeping Unit
        type: String,
        required: true,
        unique: true
    },
    sale_price: { // Harga Jual
        type: Number,
        required: true,
        min: 0
    },
    cost_price: { // Harga Pokok (HPP - untuk perhitungan laba)
        type: Number,
        required: true,
        min: 0
    },
    stock_quantity: { // Stok yang tersedia
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    is_active: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true // Otomatis menambahkan createdAt dan updatedAt
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;