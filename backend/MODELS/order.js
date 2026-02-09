const {model, Schema} = require("mongoose")

const orderSchema = Schema({
    totalAmount : {
        type : Number,
        required : true
    },
    address : {
        type : Schema.Types.ObjectId,
        ref : "Address"
    },
    user : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },
    products : [{
        product : {
            type : Schema.Types.ObjectId,
            ref : "Product"
        },
        quantity : {
            type: Number,
            default: 1
        },
        priceAtPurchase : {
            type : Number
        }
    }],
    status : {
        type: String,
        enum: ['Pending', 'Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Pending'
    }
}, { timestamps: true })

orderSchema.index({ status: 1 });

const Order = model('Order', orderSchema)

module.exports = Order