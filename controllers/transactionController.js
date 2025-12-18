// controllers/transactionController.js

const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const mongoose = require('mongoose');
const Sequencer = require('../models/Sequencer');

// controllers/transactionController.js

// ... (di bawah const Sequencer = require('../models/Sequencer');)

// Helper Function: Mendapatkan nomor urut transaksi harian
const getNextSequenceValue = async (session) => {
    // 1. Ambil tanggal hari ini (tanpa waktu, untuk perbandingan)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 2. Cari atau Buat dokumen Sequencer untuk hari ini
    // Menggunakan findOneAndUpdate dengan upsert true di dalam sesi transaksi
    const sequencer = await Sequencer.findOneAndUpdate(
        { date: today },
        { $inc: { sequence_value: 1 } }, // Tambah 1 ke sequence_value
        { 
            upsert: true, // Buat jika belum ada
            new: true,    // Kembalikan dokumen yang sudah diupdate
            session       // Gunakan sesi transaksi
        }
    );

    // 3. Format tanggal (YYYYMMDD) dan nomor urut (001)
    const formattedDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0')
    ].join('');
    
    // Format nomor urut harian dengan 3 digit
    const sequenceNumber = String(sequencer.sequence_value).padStart(3, '0');

    // Contoh hasil: 20251217-001
    return `${formattedDate}-${sequenceNumber}`;
};

/**
 * CREATE TRANSACTION
 */
// exports.createTransaction = async (req, res) => { ...
/**
 * CREATE TRANSACTION
 */
exports.createTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { items, payment_method } = req.body;

        if (!items || items.length === 0) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: 'Daftar item tidak boleh kosong.' });
        }

        let total_amount = 0;
        let total_cost = 0;
        const transactionItems = [];

        for (const item of items) {
            const product = await Product
                .findById(item.productId)
                .select('+cost_price')
                .session(session);

            if (!product || !product.is_active) {
                // Gunakan throw yang lebih informatif untuk error handling
                throw new Error(`Produk dengan ID ${item.productId} tidak ditemukan atau tidak aktif.`);
            }

            if (product.stock_quantity < item.quantity) {
                throw new Error(`Stok ${product.name} tidak mencukupi`);
            }

            const priceAtSale = product.sale_price;
            const costAtSale = product.cost_price || 0;

            product.stock_quantity -= item.quantity;
            await product.save({ session });

            total_amount += priceAtSale * item.quantity;
            total_cost += costAtSale * item.quantity;

            transactionItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                price_at_sale: priceAtSale,
                cost_at_sale: costAtSale
            });
        }
        
        // --- 1. AMBIL KODE TRANSAKSI UNIK ---
        const uniqueCode = await getNextSequenceValue(session);

        // 2. BUAT OBJEK TRANSAKSI
        const transaction = new Transaction({
            user: req.user._id,
            items: transactionItems,
            total_amount,
            total_cost,
            transaction_code: uniqueCode, // <<< SIMPAN KODE UNIK
            payment_method: payment_method || 'cash'
        });

        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        // --- 3. SIAPKAN DATA RESPON STRUK (RECEIPT) ---
        const receiptData = {
            transactionId: transaction._id,
            code: transaction.transaction_code, // Kode Struk (misal: 20251217-001)
            datetime: transaction.createdAt, 
            cashier: req.user.username, // Asumsi req.user diisi oleh middleware 'protect'
            items: transaction.items.map(item => ({
                name: item.name,
                qty: item.quantity,
                price: item.price_at_sale,
                subtotal: item.quantity * item.price_at_sale
            })),
            totalAmount: transaction.total_amount,
            paymentMethod: transaction.payment_method,
            // Anda bisa menambahkan field kembalian (change) di sini jika perlu
        };


        res.status(201).json({
            message: 'Transaksi berhasil dicatat, data struk siap.',
            receipt: receiptData // <<< KIRIM DATA STRUK YANG BERSIH
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        // Pastikan error response kembali ke user dengan pesan yang jelas
        res.status(500).json({ message: error.message });
    }
};
/**
 * GET ALL TRANSACTIONS (ADMIN)
 */
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction
            .find()
            .populate('user', 'username role')
            .sort({ createdAt: -1 });

        res.json(transactions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * SALES SUMMARY
 */
exports.getSummary = async (req, res) => {
    try {
        const summary = await Transaction.aggregate([
            { $match: { status: 'completed' } },
            {
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalRevenue: { $sum: '$total_amount' },
                    totalCost: { $sum: '$total_cost' }
                }
            },
            {
                $project: {
                    _id: 0,
                    totalTransactions: 1,
                    totalRevenue: 1,
                    totalCost: 1,
                    grossProfit: { $subtract: ['$totalRevenue', '$totalCost'] }
                }
            }
        ]);

        res.json(summary[0] || {
            totalTransactions: 0,
            totalRevenue: 0,
            totalCost: 0,
            grossProfit: 0
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * CANCEL TRANSACTION
 */
exports.cancelTransaction = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const transaction = await Transaction.findById(req.params.id).session(session);

        if (!transaction) {
            throw new Error('Transaksi tidak ditemukan');
        }

        if (transaction.status === 'canceled') {
            throw new Error('Transaksi sudah dibatalkan');
        }

        for (const item of transaction.items) {
            const product = await Product.findById(item.product).session(session);
            if (product) {
                product.stock_quantity += item.quantity;
                await product.save({ session });
            }
        }

        transaction.status = 'canceled';
        await transaction.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({
            message: 'Transaksi dibatalkan.',
            transaction
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: error.message });
    }
};

exports.saveDraft = async (req, res) => {
    // Tidak perlu sesi transaksi karena tidak ada update stok atau status kritis
    try {
        const { items, payment_method } = req.body;
        
        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'Daftar item draft tidak boleh kosong.' });
        }

        let total_amount = 0;
        let total_cost = 0;
        const transactionItems = [];

        for (const item of items) {
            // Ambil data produk, termasuk HPP
            const product = await Product.findById(item.productId).select('+cost_price');

            if (!product || !product.is_active) {
                return res.status(404).json({ message: `Produk ID ${item.productId} tidak ditemukan atau tidak aktif.` });
            }

            // Hitung total hanya untuk keperluan tampilan draft
            const priceAtSale = product.sale_price;
            const costAtSale = product.cost_price || 0; 
            
            total_amount += priceAtSale * item.quantity;
            total_cost += costAtSale * item.quantity; 

            transactionItems.push({
                product: product._id,
                name: product.name,
                quantity: item.quantity,
                price_at_sale: priceAtSale,
                cost_at_sale: costAtSale 
            });
        }

        // Buat Entri Transaksi dengan status 'draft'
        const draftTransaction = new Transaction({
            user: req.user._id, // User yang membuat draft
            items: transactionItems,
            total_amount: total_amount,
            total_cost: total_cost, 
            payment_method: payment_method || 'cash',
            status: 'draft' // <<< KRITIKAL: SET STATUS DRAFT
        });

        await draftTransaction.save(); 

        res.status(201).json({ 
            message: 'Pesanan berhasil disimpan sebagai draft.', 
            draft: draftTransaction 
        });

    } catch (error) {
        console.error('Error saat menyimpan draft:', error.message);
        res.status(500).json({ message: error.message });
    }
};


// Fungsi Baru: Mengambil Semua Draft
exports.getDrafts = async (req, res) => {
    try {
        const drafts = await Transaction.find({ status: 'draft' })
            .populate('user', 'username role') // Tampilkan info kasir yang membuat draft
            .sort({ createdAt: 1 }); // Urutkan dari yang terlama (untuk prioritas)

        res.status(200).json({
            count: drafts.length,
            data: drafts
        });

    } catch (error) {
        console.error('Error fetching drafts:', error.message);
        res.status(500).json({ message: error.message });
    }
};

exports.checkoutDraft = async (req, res) => {
    const transactionId = req.params.id;
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // 1. Ambil Draft
        const draft = await Transaction.findById(transactionId).session(session);

        if (!draft || draft.status !== 'draft') {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: 'Draft pesanan tidak ditemukan atau sudah di-checkout.' });
        }
        
        // 2. Validasi Stok (Harus dilakukan lagi karena stok bisa berubah sejak draft dibuat)
        for (const item of draft.items) {
            const product = await Product.findById(item.product).session(session);

            if (!product || !product.is_active) {
                await session.abortTransaction();
                session.endSession();
                return res.status(404).json({ message: `Produk ID ${item.product} tidak ditemukan atau tidak aktif.` });
            }

            if (product.stock_quantity < item.quantity) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ message: `Stok ${product.name} tidak mencukupi untuk checkout draft ini.` });
            }

            // 3. Kurangi Stok
            product.stock_quantity -= item.quantity;
            await product.save({ session });
        }

        // 4. Update Status Transaksi
        draft.status = 'completed'; // <<< KRITIKAL: UBAH STATUS
        // Anda bisa menambahkan req.body.payment_method jika ingin kasir mengubahnya saat checkout
        await draft.save({ session });

        // 5. Commit Transaksi
        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ 
            message: 'Draft berhasil di-checkout menjadi transaksi completed.',
            transaction: draft
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error saat checkout draft:', error.message);
        res.status(500).json({ message: error.message });
    }
};

exports.generateQris = async (req, res) => {
    try {
        const transactionId = req.params.id;

        // 1. Cari Transaksi untuk mendapatkan total amount
        // Kita hanya mengambil transaksi yang sudah selesai atau sedang di-draft
        const transaction = await Transaction.findById(transactionId);

        if (!transaction) {
            return res.status(404).json({ message: 'Transaksi tidak ditemukan.' });
        }

        const totalAmount = transaction.total_amount;
        
        // 2. Simulasi Data yang Akan Dikirim ke Payment Gateway (PG)
        // PG membutuhkan data seperti: merchant ID, total amount, order ID, dll.
        const paymentData = {
            orderId: transaction.transaction_code || transactionId, // Gunakan kode unik struk
            amount: totalAmount,
            merchant: "SEPUKOPI",
            // ... data lain
        };

        // 3. Simulasikan Pembuatan QR Code menggunakan API pihak ketiga (QuickChart)
        // Note: Dalam kasus nyata, URL ini akan dikembalikan oleh Payment Gateway (Midtrans/Xendit)
        
        // Data yang di-encode ke QR: Order ID dan Jumlah
        const qrContent = JSON.stringify(paymentData);
        
        // Membuat URL untuk QR Code (menggunakan layanan QuickChart sebagai simulasi visual)
        const qrisImageUrl = `https://quickchart.io/qr?text=${encodeURIComponent(qrContent)}&size=300`;

        res.status(200).json({
            message: 'QRIS berhasil di-generate (Simulasi).',
            transactionId: transactionId,
            totalAmount: totalAmount,
            qrisUrl: qrisImageUrl, // <<< URL QR CODE
            paymentStatus: "waiting_for_payment"
        });

    } catch (error) {
        console.error('Error saat generate QRIS:', error.message);
        res.status(500).json({ message: error.message });
    }
};