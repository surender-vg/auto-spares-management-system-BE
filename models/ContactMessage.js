const mongoose = require('mongoose');

const contactMessageSchema = mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, trim: true },
        subject: { type: String, trim: true },
        message: { type: String, required: true, trim: true },
        isRead: { type: Boolean, default: false },
        readAt: { type: Date },
        reply: { type: String, trim: true },
        repliedAt: { type: Date },
        repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        isReplied: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    }
);

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

module.exports = ContactMessage;
