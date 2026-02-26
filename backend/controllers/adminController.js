const mongoose = require("mongoose");
const BloodStock = require("../models/BloodStock");
const Request = require("../models/Request");
const User = require("../models/User");
const Donor = require("../models/Donor");

/* ================= AUTO UPDATE BY DATE ================= */
async function autoUpdateByDate() {
  try {
    const now = new Date();

    await Request.updateMany(
      {
        status: "Accepted",
        deliveryStatus: "Transiting",
        neededDate: { $lte: now }
      },
      {
        $set: {
          deliveryStatus: "Arrived",
          status: "Closed",
          reachDate: now
        }
      }
    );
  } catch (err) {
    console.error("Auto update failed:", err.message);
  }
}

/* ================= GET ALL ADMIN REQUESTS ================= */
const getAllRequests = async (req, res) => {
  try {
    await autoUpdateByDate();

    const data = await Request.find({ requestType: "ADMIN" })
      .populate("userId", "-password")
      .sort({ createdAt: -1 });

    return res.status(200).json(data);

  } catch (err) {
    return res.status(500).json({ message: "Failed to load requests" });
  }
};

/* ================= APPROVE REQUEST ================= */
const approveRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid request ID" });

    const request = await Request.findById(id);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.status !== "Pending")
      return res.status(400).json({ message: "Already processed" });

    const stock = await BloodStock.findOne({ bloodGroup: request.bloodGroup });
    if (!stock)
      return res.status(404).json({ message: "Stock not found" });

    if (stock.units < request.units)
      return res.status(400).json({ message: "Not enough stock" });

    /* Deduct stock */
    stock.units -= request.units;
    stock.lastUpdated = new Date();
    await stock.save();

    request.status = "Accepted";
    request.deliveryStatus = "Transiting";
    await request.save();

    return res.status(200).json({
      message: "Request approved and transiting",
      request,
      remainingStock: stock.units
    });

  } catch (err) {
    return res.status(500).json({ message: "Approve failed" });
  }
};

/* ================= REJECT REQUEST ================= */
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid request ID" });

    const request = await Request.findById(id);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.status !== "Pending")
      return res.status(400).json({ message: "Already processed" });

    request.status = "Rejected";
    await request.save();

    return res.status(200).json({ message: "Request rejected", request });

  } catch (err) {
    return res.status(500).json({ message: "Reject failed" });
  }
};

/* ================= GET ALL USERS ================= */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    return res.status(200).json(users);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load users" });
  }
};

/* ================= GET ALL DONORS ================= */
const getAllDonors = async (req, res) => {
  try {
    const donors = await Donor.find().select("-password");
    return res.status(200).json(donors);
  } catch (err) {
    return res.status(500).json({ message: "Failed to load donors" });
  }
};

/* ================= CANCEL REQUEST ================= */
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid request ID" });

    const request = await Request.findById(id);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (["Accepted", "Closed"].includes(request.status))
      return res.status(400).json({ message: "Cannot cancel processed request" });

    request.status = "Cancelled";
    await request.save();

    const user = await User.findById(request.userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.cancelCount = (user.cancelCount || 0) + 1;

    if (user.cancelCount >= 3) {
      user.bannedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }

    await user.save();

    return res.status(200).json({
      message: "Request cancelled",
      cancelCount: user.cancelCount,
      bannedUntil: user.bannedUntil || null
    });

  } catch (err) {
    return res.status(500).json({ message: "Cancel failed" });
  }
};

/* ================= MANUAL BAN ================= */
const approveBan = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid user ID" });

    const user = await User.findById(userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    user.bannedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await user.save();

    return res.status(200).json({
      message: "User banned for 3 months",
      bannedUntil: user.bannedUntil
    });

  } catch (err) {
    return res.status(500).json({ message: "Ban failed" });
  }
};

module.exports = {
  getAllRequests,
  approveRequest,
  rejectRequest,
  getAllUsers,
  getAllDonors,
  cancelRequest,
  approveBan
};