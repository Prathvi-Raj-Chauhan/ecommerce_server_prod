const {model, Schema} = require("mongoose")

const brandSchema = Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },
    country : {
        type : String,
        default : "IN"
    },
    description : {
        type : String, 
        required : true
    },
    quality : {
        type : Number, // restrict it between 1-10 like the luxuriness
    },
    category : [{
        type : Schema.Types.ObjectId,
        ref : "Category"
    }],
    products : [{
        type : Schema.Types.ObjectId,
        ref : "Product"
    }]
})

const Brand = model('Brand', brandSchema)

module.exports = Brand