

const BloodStock = require("../models/BloodStock");
const Request = require("../models/Request");
const User = require("../models/User");
const Donor = require("../models/Donor");

/* AUTO UPDATE BY DATE */
async function autoUpdateByDate() {
  const now = new Date();
  await Request.updateMany(
    {
      status: "Accepted",
      deliveryStatus: "Transiting",
      neededDate: { $lte: now }
    },
    {
      deliveryStatus: "Arrived",
      status: "Closed",
      reachDate: now
    }
  );
}

/* GET ALL REQUESTS (LIFO) */
const getAllRequests = async (req, res) => {
  try {
    await autoUpdateByDate();

    const data = await Request.find({ requestType: "ADMIN" })
      .populate("userId")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Failed to load requests" });
  }
};

/* APPROVE REQUEST */
const approveRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status !== "Pending")
      return res.status(400).json({ message: "Already processed" });

    const stock = await BloodStock.findOne({ bloodGroup: request.bloodGroup });
    if (!stock) return res.status(404).json({ message: "Stock not found" });

    if (stock.units < request.units)
      return res.status(400).json({ message: "Not enough stock" });

    stock.units -= request.units;
    await stock.save();

    request.status = "Accepted";
    request.deliveryStatus = "Transiting";
    await request.save();

    res.json({
      message: "Request approved and transiting",
      request,
      remainingStock: stock.units
    });
  } catch (e) {
    res.status(500).json({ message: "Approve failed" });
  }
};

/* REJECT REQUEST */
const rejectRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (request.status !== "Pending")
      return res.status(400).json({ message: "Already processed" });

    request.status = "Rejected";
    await request.save();

    res.json({ message: "Request rejected", request });
  } catch (e) {
    res.status(500).json({ message: "Reject failed" });
  }
};

// adminController.js

const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

const getAllDonors = async (req, res) => {
  const donors = await Donor.find().select("-password");
  res.json(donors);
};
// controllers/requestController.js

const cancelRequest = async (req, res) => {
  const { id } = req.params;
  const request = await Request.findById(id);
  if (!request) return res.status(404).json({ message: "Not found" });

  request.status = "Cancelled";
  await request.save();

  const user = await User.findById(request.userId);
  user.cancelCount += 1;

  if (user.cancelCount >= 3) {
    user.bannedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
  }
  await user.save();

  res.json({ message: "Cancelled", cancelCount: user.cancelCount });
};



const approveBan = async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.bannedUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
  await user.save();

  res.json({ message: "User banned for 3 months" });
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
