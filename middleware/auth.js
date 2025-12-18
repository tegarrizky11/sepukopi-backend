const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'User tidak ditemukan.' });
            }

            next();
        } catch (error) {
            return res.status(401).json({
                message: 'Token tidak valid atau kadaluarsa.'
            });
        }
    }

    if (!token) {
        return res.status(401).json({
            message: 'Akses ditolak, token tidak ditemukan.'
        });
    }
};

// 🔥 TAMBAHKAN INI
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'Akses ditolak. Role tidak diizinkan.'
            });
        }
        next();
    };
};
