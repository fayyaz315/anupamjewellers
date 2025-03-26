const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Route for fetching product details
router.get('/details/', productController.getProductDetails);

module.exports = router;
