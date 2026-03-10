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
} = require('../controllers/orderController');
const { protect, staffOrAdmin } = require('../middleware/authMiddleware');

router.route('/').post(protect, addOrderItems).get(protect, staffOrAdmin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/pay').put(protect, updateOrderToPaid);
router.route('/:id/deliver').put(protect, staffOrAdmin, updateOrderToDelivered);
router.route('/:id/status').put(protect, staffOrAdmin, updateOrderStatus);

module.exports = router;
