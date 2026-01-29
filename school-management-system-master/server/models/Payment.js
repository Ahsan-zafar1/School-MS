const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    paymentType: {
        type: String,
        enum: ['TUITION', 'REGISTRATION', 'EXAM', 'OTHER'],
        required: true
    },
    description: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['PENDING', 'COMPLETED', 'FAILED'],
        default: 'COMPLETED'
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Payment', paymentSchema); 