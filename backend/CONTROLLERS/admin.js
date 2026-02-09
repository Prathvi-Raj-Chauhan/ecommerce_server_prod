const USER = require("../MODELS/user");
const BRAND = require("../MODELS/brand");
const CATEGORY = require("../MODELS/categories");
const PRODUCT = require("../MODELS/products");
const ORDER = require("../MODELS/order");
const REVIEW = require("../MODELS/productReview");
const NOTIFICATIONS = require("../MODELS/notifications.js");
const redisClient = require("../REDIS/redisClient");
const firebaseAdmin = require("../firebase.js");
const {
  createTokenForUser,
  validateTokenAndReturnUserObject,
} = require("../JWT/auth");

const cloudinary = require("../CONFIG/cloudinary");

function uploadToCloudinary(fileBuffer, filename) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "Product_Images", public_id: filename },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      },
    );
    stream.end(fileBuffer);
  });
}

async function handleRegister(req, res) {
  const { name, email, password } = req.body;

  try {
    const existing = await USER.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const user = await USER.create({
      name,
      email,
      password,
      role: "ADMIN",
    });

    const token = createTokenForUser(user);

    console.log("Registration successful");

    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ error: `Registration failed error - ${err}` });
  }
}

async function handleLogin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await USER.findOne({ email: email });
    if (!user) throw new Error("User Not Found!");

    if (user.role != "ADMIN") {
      console.log(user.role);
      throw new Error("You are not an admin");
    }

    const token = await USER.matchPasswordAndGenerateToken(email, password);

    console.log("************ Login Successful ***********");

    // ✅ Set token in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      // path = where the cookie is valid
      path: "/",
      // domain = what domain the cookie is valid on
      // secure = only send cookie over https
      secure: true,
      // sameSite = only send cookie if the request is coming from the same origin
      sameSite: "none", // "strict" | "lax" | "none" (secure must be true)
      // maxAge = how long the cookie is valid for in milliseconds
      maxAge: 3600000,
    });

    return res.json({
      success: true,
      message: "Login successful",
    });
  } catch (err) {
    console.log(err);
    if (
      err.message === "User Not Found!" ||
      err.message.includes("Incorrect")
    ) {
      return res.status(401).json({ error: "Incorrect Email or Password" });
    }

    console.error(err);
    return res.status(500).json({
      message: `Error in Logging in - ${err.message}`,
    });
  }
}

async function handleAddingNewBrand(req, res) {
  try {
    const { name, country, description, quality, categoryIds } = req.body;

    const categories = await CATEGORY.find({ _id: { $in: categoryIds } }); // categoryIds will be an array of _id of category

    if (categories.length != 0) {
      if (categories.length !== categoryIds.length) {
        return res.status(400).json({
          message: "Some categories do not exist",
        });
      }
    }

    const brand = await BRAND.create({
      name,
      country,
      description,
      quality,
      category: categoryIds,
    });

    res.status(201).json({
      message: "Brand added successfully",
      brand,
    });
  } catch (err) {
    res.status(500).json({
      essage: `Error in Adding Brand - ${err.message}`,
    });
  }
}

async function handleAddingNewCategory(req, res) {
  const { name, code, description } = req.body;
  try {
    const Cat = await CATEGORY.create({
      name,
      description,
      code,
    });
    res.status(201).json({
      message: "Category added successfully",
      Cat,
    });
  } catch (e) {
    res.status(500).json({
      essage: `Error in Adding Category - ${e.message}`,
    });
  }
}

async function handleAddingNewProduct(req, res) {
  const {
    name,
    code,
    description,
    weight,
    dimensions,
    color,
    price,
    discountedPrice,
    stockQuantity,
    brand,
    categoryId,
    Pstatus,
  } = req.body;

  try {
    const category = await CATEGORY.findOne({ _id: categoryId });

    if (!category) return res.status(400).json({ message: "Invalid category" });
    const imageURLs = await Promise.all(
      req.files.map((file) =>
        uploadToCloudinary(file.buffer, file.originalname),
      ),
    );
    // const imageURLs = req.files.map((file) => {
    //   return `/uploads/${file.filename}`;
    // });
    const product = await PRODUCT.create({
      name,
      code,
      description,
      weight,
      dimensions,
      color,
      imageURLs,
      price,
      discountedPrice,
      stockQuantity,
      brand,
      Pstatus,
      category: categoryId,
    });

    await redisClient.del("home:products:v1");
    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (e) {
    res.status(500).json({
      essage: `Error in Adding product - ${e.message}`,
    });
  }
}

async function handleUpdateOfProduct(req, res) {
  const productId = req.params.productId;
  const {
    name,
    code,
    description,
    weight,
    dimensions,
    color,
    price,
    discountedPrice,
    stockQuantity,
    brand,
    categoryId,
    Pstatus,
  } = req.body;
  const imageURLs = req.files.map((file) => {
    return `/uploads/${file.filename}`;
  });
  try {
    const product = await PRODUCT.findOneAndUpdate(
      { _id: productId },
      {
        name,
        code,
        description,
        weight,
        dimensions,
        color,
        imageURLs,
        price,
        discountedPrice,
        stockQuantity,
        brand,
        status: Pstatus, // ✅ map correctly
        category: categoryId,
      },
      {
        new: true, // ✅ return updated doc
        runValidators: true,
      },
    );

    if (!product) return res.status(404).json({ error: "Product not found" });
    await redisClient.del("home:products:v1");
    return res.status(200).json({
      message: "Stock updated successfully",
      product,
    });
  } catch (err) {
    res.status(500).json({
      essage: `Error in Updating product - ${err.message}`,
    });
  }
}

async function handleDeleteProduct(req, res) {
  try {
    const productId = req.params.productId;

    const product = await PRODUCT.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    await PRODUCT.findByIdAndDelete(productId);
    await redisClient.del("home:products:v1");

    //  delete reviews / media
    // await productReview.deleteMany({ _id: { $in: product.reviews } });

    return res.json({ message: "Product deleted successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function handleUpdateOrderStatus(req, res) {
  const orderId = req.params.orderId;
  const { status } = req.body;
  try {
    const allowedStatuses = [
      "Pending",
      "Packed",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Cancelled",
    ];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid order status" });
    }
    const order = await ORDER.findByIdAndUpdate(orderId, {
      status: status,
    });
    return res.status(200).json({
      order,
      message: "Order status updated successfully",
    });
  } catch (e) {
    return res
      .status(500)
      .json({ error: `Error in updating order status - ${e}` });
  }
}

async function getAllOrder(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const status = req.query.status; // if user filters for status of the order then we use this
    const query = {}; // we made a map named query for desired status

    if (status) query.status = status;

    const orders = await ORDER.find(query)
      .select("totalAmount status createdAt address user products.quantity") // this way we can select only required fields for the order
      .populate({
        path: "address",
        select: "id state pincode",
      })
      .populate({ path: "user", select: "name" })
      .sort({ createdAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(); // Skips converting DB docs into Mongoose models → 30–50% faster <- src : chat gpt

    const ordersWithTotalItems = orders.map((order) => ({
      ...order,
      totalItems: order.products.reduce((sum, p) => sum + (p.quantity || 0), 0), //<- src : chat gpt
    }));
    const total = await ORDER.countDocuments(query);

    return res.json({
      data: ordersWithTotalItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getOrderDetails(req, res) {
  const orderId = req.params.orderId;

  try {
    const order = await ORDER.findById(orderId)
      .populate({
        path: "address",
        select: "line1 line2 city state postalCode country",
      })
      .populate({
        path: "products.product",
        select: "name code price",
      })
      .populate({ path: "user", select: "name email" })
      .lean();
    if (!order) return res.status(404).json({ error: "ORDER NOT FOUND" });

    return res.status(200).json({
      order,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getAllProducts(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const query = {};
    if (req.query.category) query.category = req.query.category;
    if (req.query.brand) query.brand = req.query.brand;
    if (req.query.minPrice)
      query.price = { ...query.price, $gte: req.query.minPrice };
    if (req.query.maxPrice)
      query.price = { ...query.price, $lte: req.query.maxPrice };

    const products = await PRODUCT.find(query)
      .select(
        // this way we can select only required fields for the order
        "_id name code imageUrls price brand discountedPrice stockQuantity category",
      )
      .populate({
        path: "category",
        select: "name",
      })
      .sort({ createdAt: -1, _id: -1 }) // here id becomes the tie breaker
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await PRODUCT.countDocuments(query);
    console.log("ALL PRODUCTS SENT");
    return res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

async function getProductDetails(req, res) {
  const { productId } = req.params;

  try {
    const product = await PRODUCT.findById(productId)
      .select(
        "name code description price discountedPrice stockQuantity imageURLs brand category reviews",
      )
      .populate({ path: "category", select: "name" })
      .populate({ path: "reviews" })
      .lean();

    if (!product) return res.status(404).json({ error: "Product not found" });

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAllUsers(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const users = await USER.find({})
      .select("name email role createdAt")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await USER.countDocuments({});

    return res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getUserDetail(req, res) {
  const { userId } = req.params;

  try {
    const user = await USER.findById(userId)
      .select("name email role address createdAt")
      .populate(address)
      .lean();

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAllBrands(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    query = {};
    const categoryId = req.query.categoryId;
    if (categoryId) {
      query.category = categoryId;
    }
    const brands = await BRAND.find(query)
      .select("name description quality category")
      .populate({ path: "category", select: "name" })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await BRAND.countDocuments({});

    return res.json({
      data: brands,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getBrandDetails(req, res) {
  const { brandId } = req.params;

  try {
    const brand = await BRAND.findById(brandId)
      .select("name description quality category products")
      .populate({ path: "category", select: "name" })
      .populate({
        path: "products",
        select: "name code price imageURLs",
      })
      .lean();

    if (!brand) return res.status(404).json({ error: "Brand not found" });

    return res.json({ brand });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getAllCategories(req, res) {
  try {
    const categories = await CATEGORY.find({})
      .select("name description")
      .lean();

    return res.json({ data: categories });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
async function getDashboardStats(req, res) {
  try {
    const [
      pendingOrders,
      processingOrders,
      completedOrders,
      totalUsers,
      totalProducts,
    ] = await Promise.all([
      // Promise.all() runs multiple async operations at the same time
      ORDER.countDocuments({ status: "PENDING" }),
      ORDER.countDocuments({
        status: { $nin: ["DELIVERED", "PENDING", "CANCELLED"] },
      }),
      ORDER.countDocuments({ status: "COMPLETED" }),
      USER.countDocuments({
        role: { $nin: "ADMIN" },
      }),
      PRODUCT.countDocuments(),
    ]);

    res.status(200).json({
      pendingOrders,
      processingOrders,
      completedOrders,
      totalUsers,
      totalProducts,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch dashboard stats" });
  }
}
function handleLogout(req, res) {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (e) {
    console.log("ERROR in logging out", e);
    return res.status(400).json({
      error: e,
    });
  }
}

async function sendOrderStatusNotification(req, res) {
  try {
    const userId = req.params.userId;

    const { status } = req.body;
    var body = "";

    const title = "Order status update";

    if (status === "Packed") {
      body = "Your Order has been Packed";
    } else if (status === "Shipped") {
      body = "Your Order has been Shipped";
    } else if (status === "Out for Delivery") {
      body = "Your Order is Out For Delivery and be arriving anytime soon";
    } else if (status === "Delivered") {
      body = "Your Order was delivered";
    } else {
      body = "Your Order has been Cancelled";
    }

    const user = await USER.findById(userId).select("fcm");
    if (!user) {
      return res.status(404).json({
        error: "User does not exist",
      });
    }
    const fcmToken = user.fcm;
    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
    };

    try {
      const response = await firebaseAdmin.messaging().send(message);
      await NOTIFICATIONS.create({
        title,
        body,
        user: userId,
      });
      res.json({ success: true, response });
    } catch (err) {
      console.error(`error in sending notification ${err}`);
      res.status(500).json({ error: err.message });
    }
  } catch (error) {
    console.log(`error in executing notification function ${error}`);
    return res.status(500).json({
      error: "There is a server error in getting fcm",
    });
  }
}
// async function sendNewOfferNotifications(req, res){

// }

// async function handleMakingCupon(req, res) {}
// async function getSalesStats(req, res) {}

module.exports = {
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
  sendOrderStatusNotification,
};
