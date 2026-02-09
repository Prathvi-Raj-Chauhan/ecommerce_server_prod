const { Schema, model } = require("mongoose");
const Product = require('../MODELS/products')
const reviewSchema = new Schema({

    product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },

    // CORE REVIEW DATA
    rating: {
        type: Number,
        required: true,
        min: [1, 'Rating must be at least 1 star.'],
        max: [5, 'Rating cannot exceed 5 stars.'],
    },
    title: {
        type: String,
        trim: true,
        maxLength: 100,
    },
    reviewText: {
        type: String,
        required: true,
    },
    
    isVerifiedBuyer: {
        type: Boolean,
        default: false,
    },

}, {
    timestamps: true 
});

// Hook to Update Product's Average Rating
reviewSchema.post('save', async function() {
    
    const product = await Product.findById(this.product).select('rating views soldCount' );

    const newCount = product.rating.count + 1;
    const newAvg =
    ((product.rating.avg * product.rating.count) + this.rating) / newCount;
    const hotScore = 
      (product.views * 0.2) +
      (product.soldCount * 3) +
      (newAvg * 5);

    await Product.findByIdAndUpdate(this.product, {
        $set: {
        'rating.avg': newAvg,
        'rating.count': newCount,
        'hotness' : hotScore
        }
    });

});


const productReview = model('productReview', reviewSchema);
module.exports = productReview;