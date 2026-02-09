const { model, Schema } = require("mongoose");

const productSchema = Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String, // product code start with P
      required: true,
      unique: true,
      match: /^P/i, // must start with P (case-insensitive)
    },
    description: {
      type: String,
      required: true,
    },
    weight: {
      type: String,
      required: true,
    },
    dimensions: {
      type: String,
    },
    color: {
      type: String,
    },
    imageURLs: [
      {
        type: String,
        isPrimary: { type: Boolean, default: false },
      },
    ],
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    discountedPrice: {
      type: Number,
      required: true,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    Pstatus: {
      type: String,
      enum: ["Active", "Disabled", "OutOfStock"],
      default: "Active",
    },
    brand: {
      type: String,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
    },
    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "productReview",
      },
    ],
    rating: {
      avg: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    hotness: {
      type: Number,
      default: 0,
      index: true,
    },
    soldCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // AI / SEMANTIC SEARCH DATA (CRITICAL)
    embeddingVector: {
      type: [Number], // Stored as an array of floating point numbers
      required: false, // Generated after product creation
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
    tage: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true },
);
productSchema.pre("save", function () {
  // Only recalculate if price or discountedPrice changed
  if (!this.isModified("price") && !this.isModified("discountedPrice")) {
    return;
  }

  if (!this.discountedPrice || this.discountedPrice >= this.price) {
    this.discountPercent = 0;
    return ;
  }

  const discount = ((this.price - this.discountedPrice) / this.price) * 100;

  this.discountPercent = Math.round(discount * 100) / 100;
  console.log(discount);

  return;
});
productSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate();

  const price = update.price ?? update.$set?.price;
  const discountedPrice =
    update.discountedPrice ?? update.$set?.discountedPrice;

  if (!price || !discountedPrice || price <= 0 || discountedPrice >= price) {
    update.$set = {
      ...(update.$set || {}),
      discountPercent: 0,
    };
    return;
  }

  const discount = ((price - discountedPrice) / price) * 100;

  update.$set = {
    ...(update.$set || {}),
    discountPercent: Math.round(discount * 100) / 100,
  };

  next();
});
productSchema.index({ soldCount: -1 });
productSchema.index({ views: -1 });
productSchema.index({ "rating.avg": -1 });
productSchema.index({ hotness: -1 });
productSchema.index({ discountPercent: -1 });

productSchema.index({
  // to implement the search functionality
  name: "text",
  description: "text",
  tags: "text",
});

const Product = model("Product", productSchema);

module.exports = Product;
