const express = require('express');
const router = express.Router();
const {
    createContactMessage,
    getContactMessages,
    getContactMessageById,
    markMessageRead,
    sendReply,
    getUserMessages,
} = require('../controllers/contactController');
const { protect, admin } = require('../middleware/authMiddleware');

const { body } = require('express-validator');
router.route('/').post([
    body('name', 'Name is required').notEmpty(),
    body('email', 'Please include a valid email').isEmail(),
    body('phone', 'Phone number must be exactly 10 digits').optional().isLength({ min: 10, max: 10 }).matches(/^\d{10}$/),
    body('message', 'Message is required').notEmpty(),
], createContactMessage).get(protect, admin, getContactMessages);
router.route('/messages/:email').get(getUserMessages);
router.route('/:id').get(protect, admin, getContactMessageById);
router.route('/:id/read').put(protect, admin, markMessageRead);
router.route('/:id/reply').put(protect, admin, sendReply);

module.exports = router;
