const USER = require("../MODELS/user");
const BRAND = require("../MODELS/brand");
const CATEGORY = require("../MODELS/categories");
const PRODUCT = require("../MODELS/products");
const ORDER = require("../MODELS/order");
const REVIEW = require("../MODELS/productReview");
const ADDRESS = require("../MODELS/address");
const NOTIFICATIONS = require("../MODELS/notifications");
const redisClient = require("../REDIS/redisClient");
const bcrypt = require("bcrypt")
const saltRounds = 10
const mongoose = require("mongoose");

const { createTokenForUser } = require("../JWT/auth");

function getFirst20Words(description) {
  if (!description) return "";

  const words = description.trim().split(/\s+/);
  return words.slice(0, 10).join(" ");
}
// Helper function to process products array
function processProducts(products) {
  return products.map((product) => ({
    ...product,
    description: getFirst20Words(product.description),
  }));
}

async function getAllProducts(req, res) {
  try {
    const cacheKey = "home:products:v1";
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      console.log("sent from cache");
      // Upstash already returns parsed JSON, no need to JSON.parse
      return res.status(200).json(cachedData);
    }

    const [newArrivals, hotProduct, topSellers, topDiscounts] =
      await Promise.all([
        PRODUCT.find({ Pstatus: "Active" })
          .select(
            "name category price discountedPrice discountPercent rating brand imageURLs description",
          )
          .sort({ createdAt: -1 })
          .limit(5)
          .lean(),

        PRODUCT.find({ Pstatus: "Active" })
          .select(
            "name category price discountedPrice discountPercent rating brand imageURLs description",
          )
          .sort({ hotness: -1 })
          .limit(5)
          .lean(),

        PRODUCT.find({ Pstatus: "Active" })
          .select(
            "name category price discountedPrice discountPercent rating brand imageURLs description",
          )
          .sort({ soldCount: -1 })
          .limit(5)
          .lean(),

        PRODUCT.find({ Pstatus: "Active" })
          .select(
            "name category price discountedPrice discountPercent rating brand imageURLs description",
          )
          .sort({ discountPercent: -1 })
          .limit(5)
          .lean(),
      ]);

    console.log("ALL PRODUCTS SENT");

    const responseData = {
      newArrivals: processProducts(newArrivals),
      hotProducts: processProducts(hotProduct),
      topSellers: processProducts(topSellers),
      topDiscounts: processProducts(topDiscounts),
    };

    // Use 'setex' (lowercase) for Upstash, and it handles JSON automatically
    await redisClient.setex(cacheKey, 300, responseData);

    return res.json(responseData);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
async function getSpecificProduct(req, res) {
  const { productId } = req.params;

  try {
    const product = await PRODUCT.findById(productId)
      .populate({ path: "category", select: "name" })
      .populate({ path: "reviews" })
      .lean(); // converts product to plain json now we cannot make changes in product from here on and do .save() on it ;

    if (!product) return res.status(404).json({ error: "Product not found" });

    PRODUCT.findByIdAndUpdate(productId, { $inc: { views: 1 } }, {new : true}).catch(
      console.error,
    );

    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
async function searchProductByQuery(req, res) {
  const { query, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (query) {
    filter.$text = { $search: query };
  }
  const skip = (page - 1) * limit;
  const products = await PRODUCT.find(
    filter,
    query ? { score: { $meta: "textScore" } } : {},
  )
    .sort(query ? { score: { $meta: "textScore" } } : { createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));
  res.json(products);
}
async function searchProductByQueryAndFilters(req, res) {
  try {
    const {
      query,
      category,
      brand,
      minPrice,
      maxPrice,
      rating,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (query) {
      filter.$text = { $search: query };
    }

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Brand filter
    if (brand) {
      filter.brand = brand;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.discountedPrice = {};

      if (minPrice) {
        filter.discountedPrice.$gte = Number(minPrice);
      }

      if (maxPrice) {
        filter.discountedPrice.$lte = Number(maxPrice);
      }
    }

    if (rating) {
      filter.rating = { $gte: Number(rating) };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await PRODUCT.find(
      filter,
      query ? { score: { $meta: "textScore" } } : {},
    )
      .sort(query ? { score: { $meta: "textScore" } } : { createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    res.json(processProducts(products));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Search failed" });
  }
}
async function getAllCategory(req, res) {
  try {
    const categories = await CATEGORY.find({})
      .select("name description")
      .lean();

    return res.json({ data: categories });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleRegistration(req, res) {
  const { name, email, password } = req.body;

  const user = await USER.findOne({ email });
  console.log(user);
  if (user) {
    return res.status(400).json({
      error: "User already exists",
    });
  }
  try {
    const newUser = await USER.create({
      name,
      email,
      password,
      role: "CUSTOMER",
    });
    const token = createTokenForUser(newUser);

    console.log("REG SUCKSESS");
    const isWeb = req.headers["x-client-type"] === "web";
    if (isWeb) {
      res.cookie("token", token, {
        httpOnly: true,
        path: "/",
        secure: true,
        sameSite: "none",
        maxAge: 3600000,
      });
      return res.json({
        success: true,
        message: "Registration successful",
      });
    } else {
      // in mobile we cannot handle cookies so i had to do it
      return res.json({
        token: token,
        success: true,
        message: "Registration successful",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: `Error in Logging in - ${err.message}`,
    });
  }
}
async function handlePassReset(req, res) {
  const { email, pass } = req.body;

  try {
    const newUser = await USER.findOneAndUpdate(
      { email: email },
      {
        pass,
      },
    );
    const token = createTokenForUser(newUser);
    console.log("Pass Reset SUCKSESS");
    const isWeb = req.headers["x-client-type"] === "web";
    if (isWeb) {
      res.cookie("token", token, {
        httpOnly: true,
        path: "/",
        secure: true,
        sameSite: "none",
        maxAge: 3600000,
      });
      return res.json({
        success: true,
        message: "Login successful",
      });
    } else {
      // in mobile we cannot handle cookies so i had to do it
      return res.json({
        token: token,
        success: true,
        message: "Login successful",
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: `Error in Resetting Password - ${err.message}`,
    });
  }
}
async function handleLogin(req, res) {
  const { email, password } = req.body;

  try {
    const token = await USER.matchPasswordAndGenerateToken(email, password);

    console.log("************ Login Successful ***********");
    const isWeb = req.headers["x-client-type"] === "web";
    if (isWeb) {
      res.cookie("token", token, {
        httpOnly: true,
        path: "/",
        secure: true,
        sameSite: "none",
        maxAge: 3600000,
      });
      return res.json({
        success: true,
        message: "Login successful",
      });
    } else {
      // in mobile we cannot handle cookies so i had to do it
      return res.json({
        token: token,
        success: true,
        message: "Login successful",
      });
    }
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
async function handleLogout(req, res) {
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

async function handleAddingAddress(req, res) {
  const { line1, line2, city, state, postalCode, country } = req.body;
  try {
    const user = await USER.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        erro: "NO USER FOUND",
      });
    }
    const address = await ADDRESS.create({
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      user: req.user._id,
    });
    return res.status(201).json({
      address,
      message: "Address added successfully",
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      error: "Failed to add new Address",
    });
  }
}
async function handleDeletingAddress(req, res) {
  try {
    const address = await ADDRESS.findById(req.params.id);
    if (!address) {
      return res.status(404).json({
        error: "Address Not found",
      });
    }
    await ADDRESS.findByIdAndUpdate(req.params.id, {
      isActive: false,
      deletedAt: new Date(),
    });
    return res.status(200).json({
      status: "Success",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: "Failed to Delete Address",
    });
  }
}
async function getAllUserAddresses(req, res) {
  const userId = req.user._id;
  try {
    const addresses = await ADDRESS.find({ user: userId , isActive: true }).lean();
    if (!addresses) {
      return res.status(404).json({
        message: "NO ADDRESSES ADDED YET",
      });
    }
    return res.json({
      addresses: addresses,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Failed to get Address List",
    });
  }
}
async function handleAddingItemToCart(req, res) {
  const productId = req.params.productId;
  const userId = req.user._id;

  try {
    const user = await USER.findById(userId);
    let cartItem = user.cart.find(
      // we have to find it manually only
      (item) => item.productId.toString() === productId, // we convert it to string to avoid the object comparision
    );
    if (cartItem) {
      cartItem.quantity += 1;
    } else {
      cartItem = {
        productId,
        quantity: 1,
      };
      user.cart.push(cartItem);
    }
    await user.save();
    const product = await PRODUCT.findById(productId);
    let finalCartItem = {
      productId: product,
      quantity: cartItem.quantity,
    };
    return res.json({
      success: true,
      cartItem: finalCartItem,
      cart: user.cart,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: `Failed to add item to cart ${err}`,
    });
  }
}

async function handleDeleteItemFromCart(req, res) {
  const productId = req.params.productId;
  const userId = req.user._id;
  try {
    const user = await USER.findById(userId);
    let cartItem = user.cart.find(
      // we have to find it manually only
      (item) => item.productId.toString() === productId, // we convert it to string to avoid the object comparision
    );

    if (!cartItem) {
      return res.status(404).json({
        error: "Product does not exist",
      });
    }
    cartItem.quantity -= 1;
    let removed = false;
    if (cartItem.quantity <= 0) {
      removed = true;
      user.cart = user.cart.filter(
        (item) => item.productId.toString() !== productId,
      );
    }
    const product = await PRODUCT.findById(productId);
    let finalCartItem = {
      productId: product,
      quantity: cartItem.quantity,
    };
    await user.save();

    if (removed) {
      return res.json({
        success: true,
        cart: user.cart,
        removed: removed,
      });
    } else {
      return res.json({
        success: true,
        cartItem: finalCartItem,
        cart: user.cart,
        removed: removed,
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: `Failed to add item to cart ${err}`,
    });
  }
}

// async function handlePlacingOrder(req, res) {
//   const { productId, userId } = req.body;
//   const session = await mongoose.startSession(); // we want this transaction to be atomic
//   try {
//     const user = await USER.findById(userId);

//     const addressId = user.address;

//     const product = await PRODUCT.findByIdAndUpdate(productId,
//       {$inc: {quantity : quantity-1}}
//     );

//     const totalAmount = product.discountedPrice;

//     const productsList = [
//       {
//         product: productId,
//         quantity: 1,
//         priceAtPurchase: totalAmount,
//       },
//     ];
//     session.startTransaction();

//     const order = await ORDER.create({
//       totalAmount,
//       address: addressId,
//       user: userId,
//       products: productsList,
//     });
//     await PRODUCT.findByIdAndUpdate(productId,
//       {$inc: {quantity : quantity-1}}
//     );

//     await session.commitTransaction();
//     session.endSession();
//     return res.status(201).json({
//       success: true,
//       message: "Order placed successfully",
//       order,
//     });
//   } catch (err) {
//     console.error("Error in placing order", err);
//     return res.status(500).json({
//       error: "Failed to place order",
//     });
//   }
// }
async function handlePlacingOrder(req, res) {
  const userId = req.user._id;
  const { productId, addressId } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await USER.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    const product = await PRODUCT.findById(productId)
      .select("price discountedPrice quantity")
      .session(session);

    if (!product || product.quantity < 1) {
      throw new Error("Out of stock");
    }

    const price = product.discountedPrice ?? product.price;

    const order = await ORDER.create(
      [
        {
          user: userId,
          address: addressId,
          totalAmount: price,
          products: [
            {
              product: productId,
              quantity: 1,
              priceAtPurchase: price,
            },
          ],
        },
      ],
      { session },
    );

    await PRODUCT.findByIdAndUpdate(
      productId,
      {
        $inc: {
          stockQuantity: -1,
          soldCount: +1,
        },
      },

      { session },
      {new : true}
    );

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
}

async function handlePlacingCartOrder(req, res) {
  const userId = req.user._id;
  const { addressId } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await USER.findById(userId).session(session);
    if (!user || user.cart.length === 0) {
      throw new Error("Cart empty or user not found");
    }

    let totalAmount = 0;
    const productsList = [];

    for (const item of user.cart) {
      const product = await PRODUCT.findById(item.productId)
        .select("price discountedPrice quantity")
        .session(session);

      if (!product || product.quantity < item.quantity) {
        throw new Error("Insufficient stock");
      }

      const price = product.discountedPrice ?? product.price;
      totalAmount += price * item.quantity;

      productsList.push({
        product: item.productId,
        quantity: item.quantity,
        priceAtPurchase: price,
      });

      await PRODUCT.findByIdAndUpdate(
        item.productId,
        {
          $inc: {
            stockQuantity: -item.quantity,
            soldCount: +item.quantity,
          },
        },
        { session },
        {new : true}
      );
    }

    const order = await ORDER.create(
      [
        {
          // mongodb uses insertmany by default but we cannot do it fo the session array of mongodb
          user: userId,
          address: addressId,
          totalAmount,
          products: productsList,
        },
      ],
      { session },
    );

    user.cart = [];
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ success: true, order });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
}

async function getAllCartProducts(req, res) {
  const userId = req.user._id;

  try {
    const user = await USER.findById(userId)
      .select("cart")
      .populate("cart.productId");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json({
      data: user.cart,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getUserOrderHistory(req, res) {
  try {
    const user = req.user._id;
    const orders = await ORDER.find({ user })
      .select("totalAmount status address createdAt")
      .populate("address")
      .populate({
        path: "products.product",
        select: "imageURLs",
      })
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({
      orders,
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
        select: "name code discountePrice imageURLs",
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

async function setFcm(req, res) {
  const { fcm } = req.body;
  const userId = req.user._id;
  console.log(`FCM TOKEN GIVEN BY USER IS ${fcm}`);
  try {
    const user = await USER.findByIdAndUpdate(
      userId,
      { fcm: fcm },
      { new: true },
    ); // return the updated document instead of old
    if (!user) {
      return res.status(404).json({
        error: "Invalid User id",
      });
    }
    return res.json({
      status: "success",
      message: "FCM set successful",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      error: "Error in setting FCM",
    });
  }
}
async function getNotificationLogs(req, res) {
  try {
    const userId = req.user._id;
    if (!userId) {
      res.status(401).json({
        error: "Unauthorized action",
      });
    }
    const user = await USER.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: "User not found",
      });
    }
    const notifications = await NOTIFICATIONS.find({ user: userId }).sort({
      createdAt: -1,
    });
    if (!notifications) {
      return res.status(404).json({
        status: "No Notifications Yet",
      });
    }
    return res.json({
      notification: notifications,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      error: "Error in sending Notif logs",
    });
  }
}

async function handleResettingPassword(req, res){
  console.log(req.user)
  const userId = req.user._id
  try{
    const user = await USER.findById(userId)

    if(!user){
      return res.status(404).json({
        error : "User Not found"
      })
    }

    const oldPass = req.body.oldPassword
    const newPass = req.body.newPassword
    const correct = await bcrypt.compare(oldPass, user.password)
    if(!correct){
      return res.status(401).json({
        status : "Unauthorized action"
      })
    }
    user.password = newPass
    await user.save()
    return res.status(200).json({
      status : "Successfully resetted password"
    })
  }
  catch(e){
    console.log(e)
    return res.status(500).json({
      error : "Server Error"
    })
  }
}

module.exports = {
  getUserOrderHistory,
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
  getAllUserAddresses,
  getAllCartProducts,
  handleDeleteItemFromCart,
  getOrderDetails,
  setFcm,
  getNotificationLogs,
  handleDeletingAddress,
  handleResettingPassword
};
