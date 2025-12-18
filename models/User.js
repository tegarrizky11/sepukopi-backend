const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['admin', 'kasir'],
        default: 'kasir'
    },
    is_active: {
        type: Boolean,
        default: true
    }
});

/* 🔥 PRE SAVE MIDDLEWARE (INI KUNCI) */
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


/* METHOD LOGIN */
userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password, this.password);
};

/* METHOD JWT */
userSchema.methods.generateAuthToken = function () {
    return jwt.sign(
        {
            id: this._id.toString(), // 🔥 FIX UTAMA
            role: this.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};


module.exports = mongoose.model('User', userSchema);
