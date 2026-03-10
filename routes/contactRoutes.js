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

router.route('/').post(createContactMessage).get(protect, admin, getContactMessages);
router.route('/messages/:email').get(getUserMessages);
router.route('/:id').get(protect, admin, getContactMessageById);
router.route('/:id/read').put(protect, admin, markMessageRead);
router.route('/:id/reply').put(protect, admin, sendReply);

module.exports = router;
