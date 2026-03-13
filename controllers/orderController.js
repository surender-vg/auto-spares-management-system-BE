const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const { validationResult } = require('express-validator');
const addOrderItems = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const {
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
        } = req.body;

        if (!orderItems || orderItems.length === 0) {
            return res.status(400).json({ message: 'No order items' });
        }

        if (shippingAddress && shippingAddress.phone && (!/^\d{10}$/.test(shippingAddress.phone))) {
            return res.status(400).json({ message: 'Shipping phone number must be exactly 10 digits' });
        }

        const normalizedItems = orderItems.map((item) => {
            const productId = item.product || item._id;
            if (!productId) throw new Error('Order item is missing product id');
            return {
                name: item.name,
                qty: Number(item.qty),
                image: item.image,
                price: Number(item.price),
                product: productId,
            };
        });

        // Validate stock availability for all items before creating the order
        const stockErrors = [];
        await Promise.all(
            normalizedItems.map(async (item) => {
                const product = await Product.findById(item.product);
                if (!product) {
                    stockErrors.push(`Product not found`);
                } else if (product.countInStock < item.qty) {
                    stockErrors.push(
                        product.countInStock === 0
                            ? `"${product.name}" is out of stock`
                            : `Only ${product.countInStock} unit(s) of "${product.name}" available`
                    );
                }
            })
        );
        if (stockErrors.length > 0) {
            return res.status(400).json({ message: stockErrors.join('. ') });
        }

        const order = await Order.create({
            orderItems: normalizedItems,
            user: req.user._id,
            shippingAddress,
            paymentMethod,
            itemsPrice: Number(itemsPrice),
            taxPrice: Number(taxPrice),
            shippingPrice: Number(shippingPrice),
            totalPrice: Number(totalPrice),
            status: 'Processing',
        });

        // Decrement stock for each ordered item
        await Promise.all(
            normalizedItems.map(item =>
                Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { countInStock: -item.qty } },
                    { new: true }
                )
            )
        );

        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
        'user',
        'name email'
    );

    if (order) {
        res.json(order);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Update order to paid
// @route   PUT /api/orders/:id/pay
// @access  Private
const updateOrderToPaid = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isPaid = true;
        order.paidAt = Date.now();
        order.paymentResult = {
            id: req.body.id,
            status: req.body.status,
            update_time: req.body.update_time,
            email_address: req.body.email_address,
        };

        const updatedOrder = await order.save();

        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Update order to delivered
// @route   PUT /api/orders/:id/deliver
// @access  Private/Admin/Staff
const updateOrderToDelivered = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
        order.isDelivered = true;
        order.deliveredAt = Date.now();
        order.status = 'Delivered';

        const updatedOrder = await order.save();

        res.json(updatedOrder);
    } else {
        res.status(404);
        throw new Error('Order not found');
    }
});

// @desc    Update order status (4-stage: Processing → Shipped → Out for Delivery → Delivered)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Staff
const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const { status } = req.body;
        const validStatuses = ['Processing', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const updateFields = { status };

        if (status === 'Delivered') {
            updateFields.isDelivered = true;
            updateFields.deliveredAt = Date.now();
            // Auto-mark COD orders as paid on delivery
            if (order.paymentMethod === 'Cash on Delivery' && !order.isPaid) {
                updateFields.isPaid = true;
                updateFields.paidAt = Date.now();
            }
        } else if (status === 'Cancelled') {
            updateFields.isDelivered = false;
            updateFields.deliveredAt = undefined;
            // Restore stock when admin cancels
            await Promise.all(
                order.orderItems.map(item =>
                    Product.findByIdAndUpdate(
                        item.product,
                        { $inc: { countInStock: item.qty } },
                        { new: true }
                    )
                )
            );
        } else {
            updateFields.isDelivered = false;
            updateFields.deliveredAt = undefined;
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            updateFields,
            { new: true }
        ).populate('user', 'id name');

        res.json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id });
    res.json(orders);
});

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private/Admin/Staff
const getOrders = asyncHandler(async (req, res) => {
    const orders = await Order.find({}).populate('user', 'id name');
    res.json(orders);
});

// @desc    Cancel order by user
// @route   PUT /api/orders/:id/cancel
// @access  Private (only order owner)
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        if (order.status === 'Cancelled') {
            return res.status(400).json({ message: 'Order is already cancelled' });
        }
        if (order.status === 'Delivered') {
            return res.status(400).json({ message: 'Delivered orders cannot be cancelled' });
        }
        
        // Allow admin/staff to cancel any order; users can only cancel their own
        const isAdminOrStaff = req.user.role === 'admin' || req.user.role === 'staff';
        if (!isAdminOrStaff && order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to cancel this order' });
        }
        
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status: 'Cancelled' },
            { new: true }
        );

        // Restore stock for each item in the cancelled order
        await Promise.all(
            order.orderItems.map(item =>
                Product.findByIdAndUpdate(
                    item.product,
                    { $inc: { countInStock: item.qty } },
                    { new: true }
                )
            )
        );
        
        res.json({ message: 'Order cancelled successfully', order: updatedOrder });
    } catch (error) {
        console.error('Cancel order error:', error.message);
        res.status(500).json({ message: error.message || 'Failed to cancel order' });
    }
};

module.exports = {
    addOrderItems,
    getOrderById,
    updateOrderToPaid,
    updateOrderToDelivered,
    updateOrderStatus,
    getMyOrders,
    getOrders,
    cancelOrder,
};
