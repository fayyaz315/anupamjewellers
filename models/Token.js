// models/Token.js
const mongoose = require('mongoose');

// Define the Token schema for MongoDB
const tokenSchema = new mongoose.Schema({
    access_token: {
        type: String,
        required: true
    },
    access_token_secret: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: '7d' // Optional: automatically delete tokens after 7 days
    }
});

// Create and export the Token model
const Token = mongoose.model('Token', tokenSchema);
module.exports = Token;
