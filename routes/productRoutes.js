const express = require('express');
const router = express.Router();
const {
    getProducts,
    getProductById,
    deleteProduct,
    updateProduct,
    createProduct,
} = require('../controllers/productController');
const { protect, staffOrAdmin } = require('../middleware/authMiddleware');

router.route('/').get(getProducts).post(protect, staffOrAdmin, createProduct);
router
    .route('/:id')
    .get(getProductById)
    .delete(protect, staffOrAdmin, deleteProduct)
    .put(protect, staffOrAdmin, updateProduct);

module.exports = router;
