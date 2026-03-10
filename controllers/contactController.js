const asyncHandler = require('express-async-handler');
const ContactMessage = require('../models/ContactMessage');

// @desc    Create contact message
// @route   POST /api/contact
// @access  Public
const createContactMessage = asyncHandler(async (req, res) => {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
        res.status(400);
        throw new Error('Name, email, and message are required');
    }

    const createdMessage = await ContactMessage.create({
        name,
        email,
        phone,
        subject,
        message,
    });

    res.status(201).json({
        message: 'Message sent successfully',
        data: createdMessage,
    });
});

// @desc    Get all contact messages
// @route   GET /api/contact
// @access  Private/Admin
const getContactMessages = asyncHandler(async (req, res) => {
    const messages = await ContactMessage.find({}).sort({ createdAt: -1 });
    res.json(messages);
});

// @desc    Get contact message by ID
// @route   GET /api/contact/:id
// @access  Private/Admin
const getContactMessageById = asyncHandler(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        res.status(404);
        throw new Error('Message not found');
    }

    res.json(message);
});

// @desc    Mark message as read
// @route   PUT /api/contact/:id/read
// @access  Private/Admin
const markMessageRead = asyncHandler(async (req, res) => {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        res.status(404);
        throw new Error('Message not found');
    }

    message.isRead = true;
    message.readAt = Date.now();

    const updatedMessage = await message.save();
    res.json(updatedMessage);
});

// @desc    Send reply to contact message
// @route   PUT /api/contact/:id/reply
// @access  Private/Admin
const sendReply = asyncHandler(async (req, res) => {
    const { reply } = req.body;

    if (!reply) {
        res.status(400);
        throw new Error('Reply is required');
    }

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
        res.status(404);
        throw new Error('Message not found');
    }

    message.reply = reply;
    message.isReplied = true;
    message.repliedAt = Date.now();
    message.repliedBy = req.user._id;

    const updatedMessage = await message.save();
    res.json({
        message: 'Reply sent successfully',
        data: updatedMessage,
    });
});

// @desc    Get user's messages and replies
// @route   GET /api/contact/messages/:email
// @access  Public
const getUserMessages = asyncHandler(async (req, res) => {
    const messages = await ContactMessage.find({ email: req.params.email }).sort({ createdAt: -1 });
    res.json(messages);
});

module.exports = {
    createContactMessage,
    getContactMessages,
    getContactMessageById,
    markMessageRead,
    sendReply,
    getUserMessages,
};
