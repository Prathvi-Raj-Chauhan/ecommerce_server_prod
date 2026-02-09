const {model, Schema} = require("mongoose")

const notificationSchema = Schema({
    title: {
        type : String,
        required : true,
    },
    body : {
        type : String,
        required : true,
    },
    imageUrl : {
        type : String
    },
    user : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }
},{timestamps : true})

const Notif = model('Notification', notificationSchema)

module.exports = Notif