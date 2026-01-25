const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: "Donor", default: null },
  stockId: { type: mongoose.Schema.Types.ObjectId, ref: "BloodStock", default: null },

  bloodGroup: { type: String, required: true },
  units: { type: Number, required: true, min: 1 },

  hospital: String,
  neededDate: { type: Date, required: true },
  patientName: String,
  contact: String,

  requestType: { type: String, enum: ["USER", "ADMIN", "DONOR"], required: true },
  parentRequestId: { type: mongoose.Schema.Types.ObjectId, ref: "Request", default: null },

  suppliedUnits: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["WaitingForMatch", "Pending", "Accepted", "Rejected", "Closed"],
    default: "WaitingForMatch",
  },

  deliveryStatus: {
    type: String,
    enum: ["Transiting", "Arrived"],
    default: "Transiting",
  },

  reachDate: { type: Date, required: true },
  city: { type: String, required: true },
  
  donorContact: {
    name: String,
    phone: String
  },
  userContact: {
    name: String,
    phone: String
  },


},
  { timestamps: true });

module.exports = mongoose.model("Request", requestSchema);
