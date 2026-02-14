const express = require("express");
const router = express.Router();

const auth = require("../MIDDLEWARES/authMiddleware");

const {
  getAllProducts,
  getSpecificProduct,
  searchProductByQuery,
  searchProductByQueryAndFilters,
  getAllCategory,
  handleLogin,
  handleRegistration,
  handleLogout,
  handleAddingAddress,
  handleAddingItemToCart,
  handlePlacingOrder,
  handlePlacingCartOrder,
  getAllCartProducts,
  handleDeleteItemFromCart,
  getAllUserAddresses,
  getUserOrderHistory,
  getOrderDetails,
  setFcm,
  getNotificationLogs,
  handleDeletingAddress,
  handleResettingPassword
} = require("../CONTROLLERS/user");

router.get("/home/products", getAllProducts);
router.get("/product/:productId", getSpecificProduct);
router.get("/search/product", searchProductByQuery);
router.get("/search/product/list", searchProductByQueryAndFilters);
router.get("/search/category", getAllCategory);
router.get("/address/", auth, getAllUserAddresses);
router.get("/cart/", auth, getAllCartProducts);
router.get("/orderHistory", auth, getUserOrderHistory);
router.get("/order/:orderId", auth, getOrderDetails);
router.get("/notifications", auth, getNotificationLogs);

router.post("/login", handleLogin);
router.post("/register", handleRegistration);
router.post("/reset-pass",auth, handleResettingPassword);
router.post("/logout", handleLogout);
router.post("/setfcm", auth, setFcm)


router.post("/new-address", auth, handleAddingAddress);
router.post("/place-one-order", auth, handlePlacingOrder);
router.post("/add-to-cart/:productId", auth, handleAddingItemToCart);
router.post("/place-order-cart", auth, handlePlacingCartOrder);

router.delete("/delete-from-cart/:productId", auth, handleDeleteItemFromCart);
router.delete("/address/:id", auth, handleDeletingAddress)

router.get("/auth-check", auth, (req, res) => {
  res.json({ 
    status: true,
    "userName" : req.user.name,
    "email" : req.user.email
  });
  console.log("AUTH CHECK SUCCESS");
});

module.exports = router;
