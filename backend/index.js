const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const app = express()
const cookieParser = require("cookie-parser");
const path = require("path")
const PORT = process.env.PORT || 3000;
const helmet = require("helmet");
const morgan = require("morgan");
require('dotenv').config();


// mongoose.connect('mongodb://127.0.0.1:27017/Ecommerce')
// mongoose.connect(process.env.MONGODB_CLUSTER_URL)
// .then(() => { console.log("mongodb connected successfully ") })
// .catch((e) => { console.log("error in connecting to mongo db", e) })
mongoose.connect(process.env.MONGODB_CLUSTER_URL, {
  dbName: "Ecommerce",
  // maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
})
.then(()=> console.log("MongoDB Connected"))
.catch(err => {
  console.error("MongoDB Error:", err);
  process.exit(1);
});

const adminRoutes = require("./ROUTES/admin")
const userRoutes = require("./ROUTES/user")

app.use(helmet());
app.use(morgan("dev"));
app.use(cookieParser());

const allowedOrigins = [
  "http://localhost:51732",
  // frontend url also
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
// app.use(
//   "/uploads",
//   express.static(path.resolve("./public/uploads"))
// );
app.use(express.urlencoded({extended: false}))
app.use(express.json())

// ✅ API routes FIRST
app.get("/", (req, res) => {
  res.send("Server is running 🚀");
});
app.use('/user', userRoutes)
app.use('/admin', adminRoutes)


app.listen(PORT,'0.0.0.0', () => console.log(`Server Started successfully at PORT - ${PORT}`))