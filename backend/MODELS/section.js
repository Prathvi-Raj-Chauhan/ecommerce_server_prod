const {model, Schema} = require("mongoose")

const sectionSchema = Schema({
    name : {
        type : String,
        required : true
    },
    products : [{
        type : Schema.Types.ObjectId,
        ref : "Product"
    }]
})

const section = model('Section', sectionSchema)

module.exports = section