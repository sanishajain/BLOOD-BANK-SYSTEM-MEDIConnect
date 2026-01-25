// models/BloodStock.js
const mongoose = require("mongoose");

const bloodStockSchema = new mongoose.Schema({
  bloodGroup: {
    type: String,
    required: true,
  },
  units: {
    type: Number,
    required: true,
    min: 0,
  },
  source: {
    type: String,
    enum: ["ADMIN", "DONOR"],
    default: "ADMIN",
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("BloodStock", bloodStockSchema);
