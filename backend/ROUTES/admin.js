const express = require("express");
const router = express.Router();

const auth = require("../MIDDLEWARES/authMiddleware");
const requireAdmin = require("../MIDDLEWARES/requireAdmin");

const multer = require("multer")
const path = require("path")

// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, path.resolve('./public/uploads/'))
//   },
//   filename: function (req, file, cb) {
//     const filename = `${file.originalname}`
//     cb(null,filename)
//   }
// })
const storage = multer.memoryStorage()

const upload = multer({ storage: storage })

// CONTROLLERS
const {
      handleRegister,
      handleLogin,
      handleAddingNewBrand,
      handleAddingNewCategory,
      handleAddingNewProduct,
      handleUpdateOfProduct,
      handleDeleteProduct,
      handleUpdateOrderStatus,
      getAllOrder,
      getOrderDetails,
      getAllProducts,
      getProductDetails,
      getAllUsers,
      getUserDetail,
      getAllBrands,
      getBrandDetails,
      getAllCategories,
      getDashboardStats,
      handleLogout,
      sendOrderStatusNotification
    } = require('../CONTROLLERS/admin');


// ----- AUTH -----
router.post("/register", handleRegister);
router.post("/login", handleLogin);
router.post("/logout", handleLogout)

// ----- USERS (admin protected) -----
router.get("/users", auth, requireAdmin, getAllUsers);
router.get("/users/:userId", auth, requireAdmin, getUserDetail);
router.post("/user/orderUpdate/:userId", auth, requireAdmin, sendOrderStatusNotification)


// ----- PRODUCTS -----
router.get("/products", getAllProducts);
router.get("/products/:productId", getProductDetails);
router.post("/products",upload.array("imageURLs", 10),  auth, requireAdmin, handleAddingNewProduct);
router.delete("/products/:productId", auth, requireAdmin, handleDeleteProduct);
router.patch("/products/:productId",upload.array("imageURLs", 10), auth, requireAdmin, handleUpdateOfProduct);

// ----- BRANDS -----
router.post("/brands", auth, requireAdmin, handleAddingNewBrand);
router.get("/brands", auth, requireAdmin, getAllBrands);
router.get("/brands/:brandId", auth, requireAdmin, getBrandDetails);

// ----- CATEGORIES -----
router.post("/categories", auth, requireAdmin, handleAddingNewCategory);
router.get("/categories", auth, requireAdmin, getAllCategories);

// ----- ORDERS -----
router.get("/orders", getAllOrder);
router.get("/order/:orderId", getOrderDetails);
router.patch("/orders/:orderId/status", handleUpdateOrderStatus);

// ----- STATS -----
router.get("/stats", getDashboardStats)

// ----- SECURITY ROUTES -----
router.get('/auth-check', auth, (req, res) => {
  res.json({ ok: true });
  console.log("AUTH CHECK SUCCESS")
});

// // ----- SALES -----
// router.get("/sales/stats", auth, requireAdmin, getSalesStats);

// // ----- COUPONS -----
// router.post("/coupons", auth, requireAdmin, handleMakingCupon);

module.exports = router;
