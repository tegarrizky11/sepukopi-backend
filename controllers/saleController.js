const Sale = require('../models/Sale');
const Product = require('../models/Product'); 
const User = require('../models/User'); 

// 1. RIWAYAT TRANSAKSI DETAIL
exports.getDetailedReport = async (req, res) => {
    try {
        const { date } = req.query; 
        let query = { status: 'Completed' };

        if (date) {
            // Memastikan range waktu benar-benar hanya 24 jam (00:00 - 23:59)
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.transaction_date = { $gte: start, $lte: end };
        }

        const sales = await Sale.find(query)
            .populate('cashier_id', 'name')
            .sort({ transaction_date: -1 });
            
        // Selalu kirim status 200, meskipun array kosong []
        res.status(200).json(sales || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 2. PROSES TRANSAKSI (POS)
exports.createSale = async (req, res) => {
    const { cart, paymentMethod } = req.body; 
    const cashierId = req.user.id; 

    if (!cart || cart.length === 0) return res.status(400).json({ message: 'Keranjang belanja kosong.' });

    try {
        let totalAmount = 0;
        let totalCostAmount = 0; 
        const saleItems = cart.map(item => {
            const itemTotalPrice = Number(item.sale_price) * Number(item.qty);
            const itemTotalCost = Number(item.cost_price || 0) * Number(item.qty);
            totalAmount += itemTotalPrice;
            totalCostAmount += itemTotalCost;

            return {
                product_id: item._id,
                name: item.name,
                qty: Number(item.qty),
                price_per_unit: Number(item.sale_price),
                cost_per_unit: Number(item.cost_price || 0),
                total_price: itemTotalPrice,
            };
        });

        const newSale = new Sale({
            total_amount: totalAmount,
            total_cost: totalCostAmount, 
            payment_method: paymentMethod || 'Cash',
            cashier_id: cashierId,
            items: saleItems,
            status: 'Completed'
        });

        await newSale.save();

        // Update Stok
        const bulkOps = cart.map(item => ({
            updateOne: {
                filter: { _id: item._id },
                update: { $inc: { stock_quantity: -item.qty } }
            }
        }));
        await Product.bulkWrite(bulkOps);

        res.status(201).json({ message: 'Transaksi berhasil!', sale: newSale });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// 3. STATISTIK UTAMA (BOX DASHBOARD)
exports.getStats = async (req, res) => {
    try {
        const { date } = req.query;
        const now = new Date();
        
        // JIKA DATE DIPILIH: Reset statistik harian sesuai tanggal tersebut
        let targetStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (date) {
            targetStart = new Date(date);
            targetStart.setHours(0, 0, 0, 0);
        }
        let targetEnd = new Date(targetStart);
        targetEnd.setHours(23, 59, 59, 999);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Ambil data bulan ini (untuk efisiensi hitung harian & bulanan sekaligus)
        const salesMonth = await Sale.find({
            transaction_date: { $gte: startOfMonth },
            status: 'Completed'
        });

        // Filter data harian dari data bulan yang sudah ditarik
        const salesDaily = salesMonth.filter(s => {
            const d = new Date(s.transaction_date);
            return d >= targetStart && d <= targetEnd;
        });

        const dailyRevenue = salesDaily.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const dailyProfit = dailyRevenue - salesDaily.reduce((sum, s) => sum + (s.total_cost || 0), 0);
        
        const monthlyRevenue = salesMonth.reduce((sum, s) => sum + (s.total_amount || 0), 0);
        const monthlyProfit = monthlyRevenue - salesMonth.reduce((sum, s) => sum + (s.total_cost || 0), 0);

        res.status(200).json({ dailyRevenue, dailyProfit, monthlyRevenue, monthlyProfit });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 4. LAPORAN GRAFIK (FIXED: Reset per jam jika harian, per hari jika bulanan)
exports.getMonthlyReport = async (req, res) => {
    try {
        const { date } = req.query;
        let query = { status: 'Completed' };

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.transaction_date = { $gte: start, $lte: end };
        } else {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            query.transaction_date = { $gte: startOfMonth };
        }

        const sales = await Sale.find(query);
        
        // PENTING: Jika data tidak ada, kirim array kosong agar chart tidak error dimensions
        if (!sales || sales.length === 0) return res.status(200).json([]);

        const report = sales.reduce((acc, sale) => {
            const d = new Date(sale.transaction_date);
            // Label meriset: Jika harian tampilkan JAM, jika bulanan tampilkan TANGGAL
            const label = date ? `${String(d.getHours()).padStart(2, '0')}:00` : d.toISOString().split('T')[0];
            
            if (!acc[label]) acc[label] = { date: label, revenue: 0, profit: 0 };
            acc[label].revenue += (sale.total_amount || 0);
            acc[label].profit += ((sale.total_amount || 0) - (sale.total_cost || 0));
            return acc;
        }, {});

        const sortedReport = Object.values(report).sort((a, b) => 
            date ? a.date.localeCompare(b.date) : new Date(a.date) - new Date(b.date)
        );

        res.status(200).json(sortedReport);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// 5. GET SEMUA SALES
exports.getSales = async (req, res) => {
    try {
        const sales = await Sale.find({}).sort({ transaction_date: -1 });
        res.status(200).json(sales || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};