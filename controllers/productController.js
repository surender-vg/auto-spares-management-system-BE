const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
    const keyword = req.query.keyword
        ? {
            name: {
                $regex: req.query.keyword,
                $options: 'i',
            },
        }
        : {};

    const products = await Product.find({ ...keyword });
    res.json(products);
});

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public
const getProductById = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        res.json(product);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin/Staff
const deleteProduct = asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);

    if (product) {
        await product.deleteOne(); // or product.remove() in older mongoose
        res.json({ message: 'Product removed' });
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin/Staff
const createProduct = asyncHandler(async (req, res) => {
    console.log('Create product request received');
    console.log('Request body:', req.body);
    console.log('User:', req.user);

    const {
        name,
        price,
        image,
        brand,
        category,
        description,
        countInStock,
        bikeModel
    } = req.body;

    // Validate user is authenticated
    if (!req.user) {
        console.error('req.user is undefined');
        res.status(401);
        throw new Error('User not authenticated. Please login again.');
    }

    if (!req.user._id) {
        console.error('req.user._id is undefined');
        res.status(401);
        throw new Error('User ID not found. Please login again.');
    }

    // Validate required fields
    if (!name || !price || !image || !brand || !category || !description || !countInStock || !bikeModel) {
        console.error('Missing required fields', { name, price, image, brand, category, description, countInStock, bikeModel });
        res.status(400);
        throw new Error('Please provide all required fields: name, price, image, brand, category, description, countInStock, bikeModel');
    }

    console.log('Creating product with user ID:', req.user._id);

    const product = new Product({
        name,
        price: Number(price),
        user: req.user._id,
        image,
        brand,
        category,
        countInStock: Number(countInStock),
        description,
        bikeModel
    });

    const createdProduct = await product.save();
    console.log('Product created successfully:', createdProduct._id);
    res.status(201).json(createdProduct);
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin/Staff
const updateProduct = asyncHandler(async (req, res) => {
    const {
        name,
        price,
        description,
        image,
        brand,
        category,
        countInStock,
        bikeModel
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
        product.name = name;
        product.price = price;
        product.description = description;
        product.image = image;
        product.brand = brand;
        product.category = category;
        product.countInStock = countInStock;
        product.bikeModel = bikeModel;

        const updatedProduct = await product.save();
        res.json(updatedProduct);
    } else {
        res.status(404);
        throw new Error('Product not found');
    }
});

module.exports = {
    getProducts,
    getProductById,
    deleteProduct,
    createProduct,
    updateProduct,
};
