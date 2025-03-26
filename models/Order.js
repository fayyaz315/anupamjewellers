const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema ({
    orderName: {
        type: String
    },
    orderId: {
        type: String
    },
    status: {
        type: String,
    },
    code: {
        type: String
    }
})


module.exports = mongoose.model('Order', OrderSchema)