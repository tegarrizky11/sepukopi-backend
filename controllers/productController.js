// server/controllers/productController.js

const Product = require('../models/Product');
const Sale = require('../models/Sale'); // Tambahkan import ini agar fungsi getSales bekerja

// =========================================================
// FUNGSIONALITAS CRUD UTAMA
// =========================================================

// 1. Mendapatkan semua produk yang aktif
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find({ is_active: true }).sort({ name: 1 });
        res.status(200).json(products); 
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. Membuat produk baru (Termasuk HPP/Cost Price)
exports.createProduct = async (req, res) => {
    try {
        // Mengambil semua field termasuk cost_price dari req.body
        const product = new Product(req.body);
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'SKU atau Nama produk sudah ada.' });
        }
        res.status(400).json({ message: error.message });
    }
};

// 3. Mengedit produk berdasarkan ID (Mendukung Edit HPP)
exports.updateProduct = async (req, res) => {
    try {
        // Destructuring req.body untuk memastikan data yang masuk bersih
        const { name, sku, sale_price, cost_price, stock_quantity, is_active } = req.body;
        
        const product = await Product.findByIdAndUpdate(
            req.params.id, 
            { name, sku, sale_price, cost_price, stock_quantity, is_active }, 
            { new: true, runValidators: true }
        );
        
        if (!product) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }
        
        res.status(200).json(product);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 4. Menghapus/Menonaktifkan produk (Soft Delete)
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByIdAndUpdate(
            req.params.id, 
            { is_active: false }, 
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.' });
        }
        
        res.status(200).json({ message: 'Produk berhasil dinonaktifkan.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// =========================================================
// FUNGSIONALITAS LAIN DAN SEEDER
// =========================================================

// 5. Mendapatkan Daftar Produk dengan Stok Rendah
exports.getLowStockProducts = async (req, res) => {
    try {
        const THRESHOLD = 10; 
        const lowStockProducts = await Product.find({ 
            is_active: true,
            stock_quantity: { $lt: THRESHOLD } 
        }).sort('stock_quantity'); 

        res.status(200).json({
            count: lowStockProducts.length,
            threshold: THRESHOLD,
            data: lowStockProducts
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 6. FUNGSI SEEDER
exports.seedProducts = async (req, res) => {
    try {
        await Product.deleteMany({}); 

        const initialProducts = [
            { name: 'Espresso', sku: 'ES001', sale_price: 18000, cost_price: 10000, stock_quantity: 50, is_active: true },
            { name: 'Cappuccino', sku: 'CA002', sale_price: 25000, cost_price: 15000, stock_quantity: 30, is_active: true },
            { name: 'Latte', sku: 'LA003', sale_price: 25000, cost_price: 15000, stock_quantity: 5, is_active: true },
            { name: 'Americano', sku: 'AM004', sale_price: 20000, cost_price: 12000, stock_quantity: 100, is_active: true },
        ];
        
        const result = await Product.insertMany(initialProducts);
        res.status(201).json({ 
            message: 'Produk berhasil diinisialisasi!',
            count: result.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Gagal inisialisasi produk: ' + error.message });
    }
};

// 7. Mendapatkan daftar riwayat penjualan
exports.getSales = async (req, res) => {
    try {
        const sales = await Sale.find({})
            .sort({ transaction_date: -1 });

        res.status(200).json(sales);
    } catch (error) {
        res.status(500).json({ message: 'Gagal memuat riwayat penjualan: ' + error.message });
    }
};