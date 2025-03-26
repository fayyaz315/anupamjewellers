// models/BackInStock.js

const mongoose = require('mongoose');

// Define the schema for the BackInStock model
const BackInStockSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    productId: {
        type: String,
        required: true
    },
    productUrl: {
        type: String,
        required: true
    },
    productTitle: {
        type: String,
        required: true
    },
    productImage: {
        type: String,
        required: true
    },
    emailSent: { type: Boolean, default: false } 
 
});

// Create the BackInStock model
const BackInStock = mongoose.model('BackInStock', BackInStockSchema);

module.exports = BackInStock;