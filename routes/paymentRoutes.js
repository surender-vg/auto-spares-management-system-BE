const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Order = require('../models/Order');

// Lazy initialization of Razorpay
let razorpayInstance = null;

const getRazorpayInstance = () => {
    if (!razorpayInstance) {
        const Razorpay = require('razorpay');
        razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });
    }
    return razorpayInstance;
};

// @desc    Get Razorpay key
// @route   GET /api/payment/razorpay/key
// @access  Public
router.get('/razorpay/key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// @desc    Create Razorpay order
// @route   POST /api/payment/razorpay/order
// @access  Private
router.post('/razorpay/order', protect, async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;

        const options = {
            amount: Math.round(amount * 100), // amount in paise
            currency,
            receipt,
        };

        const razorpay = getRazorpayInstance();
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.error('Razorpay order creation error:', error);
        res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
    }
});

// @desc    Verify Razorpay payment and update order
// @route   POST /api/payment/razorpay/verify
// @access  Private
router.post('/razorpay/verify', protect, async (req, res) => {
    try {
        const crypto = require('crypto');
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, mongo_order_id } = req.body;

        // Verify signature using Razorpay order ID and payment ID
        const sign = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSign = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(sign.toString())
            .digest('hex');

        if (razorpay_signature === expectedSign) {
            // Payment is verified, update the order to paid using MongoDB order ID
            const order = await Order.findById(mongo_order_id);
            
            if (order) {
                order.isPaid = true;
                order.paidAt = Date.now();
                order.paymentResult = {
                    id: razorpay_payment_id,
                    status: 'COMPLETED',
                    update_time: new Date().toISOString(),
                };
                
                await order.save();
                
                res.json({ 
                    success: true, 
                    message: 'Payment verified successfully',
                    order 
                });
            } else {
                res.status(404).json({ success: false, message: 'Order not found' });
            }
        } else {
            res.status(400).json({ success: false, message: 'Invalid signature' });
        }
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({ message: 'Error verifying payment', error: error.message });
    }
});

module.exports = router;
