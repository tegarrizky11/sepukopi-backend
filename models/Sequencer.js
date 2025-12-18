// models/Sequencer.js

const mongoose = require('mongoose');

const SequencerSchema = new mongoose.Schema({
    // Tanggal untuk reset harian
    date: {
        type: Date,
        default: Date.now,
        required: true,
        unique: true
    },
    // Nomor urut harian (misalnya: 001, 002)
    sequence_value: {
        type: Number,
        default: 0
    }
});

const Sequencer = mongoose.model('Sequencer', SequencerSchema);
module.exports = Sequencer;