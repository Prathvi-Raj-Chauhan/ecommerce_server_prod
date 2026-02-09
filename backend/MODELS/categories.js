const {model, Schema} = require("mongoose")

const categorySchema = Schema({
    name : {
        type : String,
        required : true,
        unique : true
    },

    description : {
        type : String, 
        required : true
    },
    code : {
        type : String, // give 4 letter short code to the category starts with C
        unique : true
    }
    
})

const Category = model('Category', categorySchema)

module.exports = Category