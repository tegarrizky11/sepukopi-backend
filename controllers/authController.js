// server/controllers/authController.js

const User = require('../models/User');

// 1. Fungsi Registrasi Umum (Bisa untuk Admin pertama kali)
exports.registerUser = async (req, res, next) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password || !role) {
            return res.status(400).json({ message: 'Semua field wajib diisi.' });
        }

        const user = new User({ username, password, role });
        await user.save();

        const token = user.generateAuthToken();

        res.status(201).json({
            message: 'User berhasil didaftarkan.',
            user: { _id: user._id, username: user.username, role: user.role },
            token
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Username sudah digunakan.' });
        }
        next(error); 
    }
};

// 🔥 2. FUNGSI KHUSUS: Admin mendaftarkan Kasir
exports.registerKasir = async (req, res, next) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username dan password wajib diisi.' });
        }

        // Paksa role menjadi 'kasir'
        const user = new User({ 
            username: username.trim(), 
            password, 
            role: 'kasir' 
        });

        await user.save();

        res.status(201).json({
            message: 'Akun Kasir berhasil dibuat.',
            user: { _id: user._id, username: user.username, role: user.role }
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Username kasir sudah digunakan.' });
        }
        next(error);
    }
};

// 3. Fungsi Login
exports.loginUser = async (req, res, next) => {
    try {
        let { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username dan password wajib diisi.'
            });
        }

        username = username.trim();

        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({
                message: 'User tidak ditemukan.'
            });
        }

        if (!user.is_active) {
            return res.status(401).json({
                message: 'Akun tidak aktif.'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                message: 'Password salah.'
            });
        }

        const token = user.generateAuthToken();

        res.status(200).json({
            message: 'Login berhasil.',
            user: {
                _id: user._id,
                username: user.username,
                role: user.role
            },
            token
        });

    } catch (error) {
        next(error);
    }
};

// 4. (Opsional) Fungsi untuk mengambil semua daftar kasir
exports.getAllKasir = async (req, res, next) => {
    try {
        const kasirs = await User.find({ role: 'kasir' }).select('-password');
        res.status(200).json(kasirs);
    } catch (error) {
        next(error);
    }
};