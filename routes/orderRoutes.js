const express = require('express');
const router = express.Router();
const {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    updateOrderToDelivered,
    updateOrderStatus,
    getMyOrders,
    getOrders,
    cancelOrder,
} = require('../controllers/orderController');
const { body } = require('express-validator');
const { protect, staffOrAdmin } = require('../middleware/authMiddleware');

router.route('/').post([
    protect,
    body('shippingAddress.phone', 'Shipping phone number must be exactly 10 digits').optional().isLength({ min: 10, max: 10 }).matches(/^\d{10}$/)
], addOrderItems).get(protect, staffOrAdmin, getOrders);
router.route('/myorders').get(protect, getMyOrders);

// Specific sub-routes must come before the parameterized /:id route
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/deliver').put(protect, staffOrAdmin, updateOrderToDelivered);
router.route('/:id/status').put(protect, staffOrAdmin, updateOrderStatus);
router.route('/:id/cancel').put(protect, cancelOrder);
router.route('/:id').get(protect, getOrderById);

module.exports = router;
