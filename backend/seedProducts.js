const mongoose = require("mongoose");
const PRODUCT = require("./MODELS/products");

mongoose.connect("mongodb://mongo:27017/Ecommerce");

const products = [];

for (let i = 1; i <= 200; i++) {
  products.push({
    name: `Test Product ${i}`,
    code: `PT-${i}`,
    description: `This is test product ${i}`,
    price: Math.floor(Math.random() * 5000) + 500,
    discountedPrice: Math.floor(Math.random() * 4000) + 300,
    stockQuantity: Math.floor(Math.random() * 50),
    brand: "TestBrand",
    categoryId: "695d3b55c54bb51d97e52a70",
    color: "Black",
    weight: "500g",
    dimensions: "10x10x10",
    imageURLs: ["https://dummyjson.com/image/150", "https://dummyjson.com/image/200", "https://dummyjson.com/image/100"],
    Pstatus: "Active",
  });
}

async function seed() {
  try {
    function calculateDiscount(product) {
      if (
        !product.discountedPrice ||
        product.discountedPrice >= product.price ||
        product.price <= 0
      ) {
        product.discountPercent = 0;
        return product;
      }

      const discount =
        ((product.price - product.discountedPrice) / product.price) * 100;

      product.discountPercent = Math.round(discount * 100) / 100;
      return product;
    }

    const processedProducts = products.map(calculateDiscount);
    await PRODUCT.insertMany(processedProducts);
    console.log("✅ Products inserted:", processedProducts.length);
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
