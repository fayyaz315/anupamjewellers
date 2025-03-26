// controllers/orderController.js

// Function to handle order notifications
exports.createOrder = (req, res) => {
    const { order_id, status, message } = req.body;

    // Log the received order update
    console.log(`Received order update: Order ID = ${order_id}, Status = ${status}, Message = ${message}`);

    // You can process the order update here, such as saving it to your database

    // Send a success message back to confirm that the order notification was received
    res.status(200).json({
        success: true,
        message: 'Order notification received successfully.'
    });
};

// Function to handle shipment notifications
exports.createShipment = (req, res) => {
    const { order_id, shipment_id, tracking_number, status } = req.body;

    // Log the received shipment update
    console.log(`Received shipment update: Order ID = ${order_id}, Shipment ID = ${shipment_id}, Tracking Number = ${tracking_number}, Status = ${status}`);

    // You can process the shipment update here, such as saving it to your database

    // Send a success message back to confirm that the shipment notification was received
    res.status(200).json({
        success: true,
        message: 'Shipment notification received successfully.'
    });
};
