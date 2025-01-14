import mongoose from "mongoose";

const alertSchema = new mongoose.Schema({
  crypto: { type: String, required: true },
  priceThreshold: { type: Number, required: true },
  userId: { type: String, required: true },
  currency: { type: String, required: true }, // Add currency field
});

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;