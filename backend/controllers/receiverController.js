const Request = require("../models/Request");
const Donor = require("../models/Donor");
const Stock = require("../models/BloodStock");
const User = require("../models/User");

/* ---------------- BLOOD COMPATIBILITY ---------------- */

const compat = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"]
};

const normalize = v => (v || "").trim().toUpperCase();

/* ---------------- CREATE USER REQUIREMENT ---------------- */

const createRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({
        message:
          "You are banned until " +
          new Date(user.bannedUntil).toDateString()
      });
    }

    const { neededDate } = req.body;

    const request = await Request.create({
      ...req.body,
      userId: req.user.id,
      requestType: "USER",
      status: "WaitingForMatch",
      deliveryStatus: "Transiting",
      reachDate: neededDate ? new Date(neededDate) : null
    });

    res.json({ message: "Requirement saved", request });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error creating request" });
  }
};

/* ---------------- USER HISTORY ---------------- */

const myRequests = async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.user.id })
      .populate("donorId", "username mobileNumber")
      .populate("userId", "username contact")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Failed to load history" });
  }
};

/* ---------------- HELPER: LAST USER REQUEST ---------------- */

const getLastReq = async (userId) => {
  return await Request.findOne({
    userId,
    requestType: "USER"
  }).sort({ createdAt: -1 });
};

/* ---------------- COMPATIBLE DONORS ---------------- */

const getCompatibleDonors = async (req, res) => {
  try {
    const last = await getLastReq(req.user.id);
    if (!last || last.status === "Closed") return res.json([]);

    const bg = normalize(last.bloodGroup);
    const allowed = compat[bg] || [];
    const today = new Date();

    const busyDonors = await Request.distinct("donorId", {
      status: { $in: ["Pending", "Accepted"] }
    });

    const donors = await Donor.find({
      bloodGroup: { $in: allowed },
      _id: { $nin: busyDonors },
      $or: [
        { nextEligibleDate: { $lte: today } },
        { nextEligibleDate: null }
      ]
    });

    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: "Failed to load donors" });
  }
};

/* ---------------- COMPATIBLE STOCK ---------------- */

const getCompatibleStock = async (req, res) => {
  try {
    const last = await getLastReq(req.user.id);
    if (!last || last.status === "Closed") return res.json([]);

    const bg = normalize(last.bloodGroup);
    const allowed = compat[bg] || [];

    const stock = await Stock.find({
      bloodGroup: { $in: allowed },
      units: { $gt: 0 }
    });

    res.json(stock);
  } catch (err) {
    res.status(500).json({ message: "Failed to load stock" });
  }
};

/* ---------------- REQUEST FROM STOCK ---------------- */

const quickRequestFromStock = async (req, res) => {
  try {
    const { stockId, bloodGroup, units } = req.body;
    const userId = req.user.id;

    const main = await getLastReq(userId);
    if (!main)
      return res.status(400).json({ message: "Create requirement first" });

    const stock = await Stock.findById(stockId);
    if (!stock)
      return res.status(404).json({ message: "Stock not found" });

    if (units > stock.units)
      return res.status(400).json({ message: "Not enough stock available" });

    // Deduct stock
    stock.units -= units;
    await stock.save();

    const r = await Request.create({
      userId,
      stockId,
      bloodGroup,
      units,
      requestType: "ADMIN",
      parentRequestId: main._id,
      status: "Pending",
      deliveryStatus: "Transiting",

      neededDate: main.neededDate,
      reachDate: main.reachDate,
      hospital: main.hospital,
      patientName: main.patientName,
      contact: main.contact,
      city: main.city
    });

    res.json(r);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Stock request failed" });
  }
};



/* ---------------- REQUEST FROM DONOR ---------------- */

const quickRequestFromDonor = async (req, res) => {
  try {
    const { donorId, bloodGroup, units } = req.body;
    const userId = req.user.id;

    const main = await getLastReq(userId);
    if (!main)
      return res.status(400).json({ message: "Create requirement first" });

    const existing = await Request.findOne({
      donorId,
      status: { $in: ["Pending", "Accepted"] }
    });

    if (existing)
      return res.status(400).json({ message: "Donor already assigned" });

    const r = await Request.create({
      userId,
      donorId,
      bloodGroup,
      units,
      requestType: "DONOR",
      parentRequestId: main._id,
      status: "Pending",
      deliveryStatus: "Transiting",

      // REQUIRED FIELDS (copy from main USER request)
      neededDate: main.neededDate,
      reachDate: main.reachDate,
      hospital: main.hospital,
      patientName: main.patientName,
      contact: main.contact,
      city: main.city
    });

    res.json(r);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Donor request failed" });
  }
};


/* ---------------- DONOR ACCEPT ---------------- */

const donorAcceptRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const donorId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const request = await Request.findOne({
      _id: requestId,
      donorId,
      status: "Pending"
    }).populate("userId", "username contact");

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    const donor = await Donor.findById(donorId);

    if (donor.nextEligibleDate && donor.nextEligibleDate > today) {
      return res.status(400).json({
        message: `Not eligible until ${donor.nextEligibleDate.toDateString()}`
      });
    }

    donor.lastDonationDate = today;

    const next = new Date(today);
    next.setDate(next.getDate() + 56);
    donor.nextEligibleDate = next;

    await donor.save();

    request.status = "Accepted";

    request.donorContact = {
      name: donor.username,
      phone: donor.mobileNumber
    };

    request.userContact = {
      name: request.userId.username,
      phone: request.userId.contact
    };

    await request.save();

    res.json({
      message: "Donation accepted",
      nextEligibleDate: donor.nextEligibleDate,
      contact: {
        donor: request.donorContact,
        requester: request.userContact
      }
    });
  } catch (err) {
    res.status(500).json({ message: "Accept failed" });
  }
};

/* ---------------- AUTO CLOSE ---------------- */

const updateArrivalStatus = async () => {
  const now = new Date();
  await Request.updateMany(
    { reachDate: { $lte: now }, deliveryStatus: "Transiting" },
    { $set: { deliveryStatus: "Arrived", status: "Closed" } }
  );
};

/* ---------------- CANCEL ---------------- */

const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;   // ✅ MUST match :id

    const request = await Request.findById(id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (["Rejected", "Closed"].includes(request.status)) {
      return res.status(400).json({ message: "Request already closed" });
    }

    request.status = "Rejected";
    request.deliveryStatus = "Transiting";
    request.suppliedUnits = 0;

    await request.save();

    res.json({ message: "Request cancelled successfully", request });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  createRequest,
  myRequests,
  getCompatibleDonors,
  getCompatibleStock,
  quickRequestFromStock,
  quickRequestFromDonor,
  donorAcceptRequest,
  updateArrivalStatus,
  cancelRequest
};
