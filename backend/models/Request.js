const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donor",
      default: null
    },

    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BloodStock",
      default: null
    },

    bloodGroup: { type: String, required: true },
    units: { type: Number, required: true, min: 1 },

    hospital: String,
    patientName: String,
    contact: String,
    city: { type: String, required: true },

    requiredDate: { type: Date, required: true },

    // ✅ ADDED (YOU WERE MISSING THIS)
    reachDate: { type: Date, default: null },

    requestType: {
      type: String,
      enum: ["USER", "ADMIN", "DONOR"],
      required: true
    },

    parentRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      default: null
    },

    status: {
      type: String,
      enum: [
        "WaitingForMatch",
        "Pending",
        "Matched",
        "Accepted",
        "Rejected",
        "Completed",
        "Closed"
      ],
      default: "WaitingForMatch"
    },

    deliveryStatus: {
      type: String,
      enum: ["Transiting", "Arrived"],
      default: "Transiting"
    },

    donorContact: {
      name: String,
      phone: String
    },

    userContact: {
      name: String,
      phone: String
    },
    cancelCount: {
      type: Number,
      default: 0
    },
    bannedUntil: {
      type: Date,
      default: null
    }


  },
  { timestamps: true });

module.exports = mongoose.model("Request", requestSchema);
