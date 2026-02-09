const jwt = require("jsonwebtoken");
const secretKey = process.env.JWT_SECRET


function authMiddleware(req, res, next) {
  let token = null;
  console.log('AUTH MIDDLEWARE INVOKED')
  // 1️⃣ Check Authorization header (mobile / Postman)
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    token = header.split(" ")[1];
  }

  // 2️⃣ Fallback to cookie (Flutter Web)
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    console.log("No token provide")
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    console.log(decoded)
    req.user = decoded;
    next();
  } catch (err) {
    console.log("Invalid or expired token")
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}


module.exports = authMiddleware;
