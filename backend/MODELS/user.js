const {Schema, model} = require("mongoose")

const bcrypt = require("bcrypt")
const saltRounds = 10
const {createTokenForUser} = require('../JWT/auth')
const userSchema = Schema({
    email : {
        type : String,
        required : true,
        unique : true
    },
    name : {
        type : String,
    },
    password : {
        type : String,
        required : true
    },
    fcm : {
        type : String
    },
    address: [{
         type: Schema.Types.ObjectId, ref: "Address" 
        }],
    cart: [{ // Storing quantity is essential for a cart
        productId: {
            type: Schema.Types.ObjectId,
            ref: "Product"
        },
        quantity: {
            type: Number,
            default: 1
        }
    }],
    role: {
        type: String,
        enum: ['CUSTOMER', 'ADMIN', 'AI'],
        default: 'CUSTOMER'
    },
},{timestamps : true})

userSchema.pre("save" , async function (){
    if (!this.isModified("password")) return ;  
    const hashed = await bcrypt.hash(this.password, saltRounds);
    this.password = hashed;
    // next() this is async function next ki zrurat nahi padegi
})
userSchema.pre("findOneAndUpdate" , async function (){
  const update = this.getUpdate();

  if (!update.password) return;

  const hashed = await bcrypt.hash(update.password, saltRounds);
  update.password = hashed;
    // next() this is async function next ki zrurat nahi padegi
})
userSchema.static('matchPasswordAndGenerateToken', async function(email, password){
    const user = await this.findOne({email: email})
    if(!user) throw new Error('User Not Found!')

    const correct = await bcrypt.compare(password, user.password);
    
    if(correct === false){
        throw new Error('Incorrect Password or email')
    }
    
    const token = createTokenForUser(user)
    return token;
})


const User = model('User' , userSchema)

module.exports = User