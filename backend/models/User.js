const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ================= BASIC PROFILE =================
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    age: {
      type: Number,
      required: true,
      min: 1,
      max: 120,
    },
    mobileNumber: {
      type: String,
      required: true,
      match: [/^[0-9]{10}$/, "Invalid mobile number"],
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },

    // ================= REQUEST FIELDS (OPTIONAL) =================
    bloodGroupNeeded: {
      type: String,
      enum: ["A+","A-","B+","B-","AB+","AB-","O+","O-"],
      default: null,
    },
    unitsNeeded: {
      type: Number,
      min: 1,
      max: 10,
      default: null,
    },
    hospital: {
      type: String,
      trim: true,
      default: null,
    },
    hospitalAddress: {
      type: String,
      trim: true,
      default: null,
    },

    // ================= CONTROL =================
   cancelCount: {
  type: Number,
  default: 0
},
bannedUntil: {
  type: Date,
  default: null
}

  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
