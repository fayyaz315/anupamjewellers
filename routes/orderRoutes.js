// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Route for order notification (HealthWarehouse Order Update)
router.post('/order-notification', orderController.createOrder);

// Route for shipment notification (HealthWarehouse Shipment Update)
router.post('/shipment-notification', orderController.createShipment);

module.exports = router;
