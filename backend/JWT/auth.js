const JWT = require("jsonwebtoken")

const secretKey = "@#$#%^%$#@#$@#REDFXDS$#@RT$WESFS 865215"

function createTokenForUser(user){
    const payload = {
        email: user.email,
        _id: user._id,
        role: user.role,
        name : user.name,
    }
    const token = JWT.sign(payload, secretKey, {
        expiresIn: "5d" // expires in 5 days
    })
    return token
}


function validateTokenAndReturnUserObject(token){
    try {
        const payload = JWT.verify(token, secretKey)
        return payload
    } catch (error) {
        console.log(`ERROR IN JWT TOKEN VERIF ${error}`)
        return null; 
    }
}

module.exports = {
    createTokenForUser,
    validateTokenAndReturnUserObject
}