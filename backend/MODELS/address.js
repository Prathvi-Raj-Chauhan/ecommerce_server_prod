const {model, Schema } = require("mongoose");

const addressSchema = new Schema(
  {
    line1: {
      type: String,
      required: true,
    },
    line2: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    postalCode: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
      default: "India",
    },

    //linking back to user
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

module.exports = model("Address", addressSchema);
