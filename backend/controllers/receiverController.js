const Request = require("../models/Request");
const Donor = require("../models/Donor");
const Stock = require("../models/BloodStock");
const User = require("../models/User");

/* ================= BLOOD COMPATIBILITY ================= */

const getCompatibleGroups = (recipientGroup) => {
  const compatibility = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
  };
  return compatibility[recipientGroup] || [];
};

/* ================= CREATE USER REQUEST ================= */

const createRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({
        message: `You are banned until ${user.bannedUntil.toDateString()}`
      });
    }

    const request = await Request.create({
      userId: user._id,
      bloodGroup: req.body.bloodGroup,
      units: Number(req.body.units),
      hospital: req.body.hospital,
      patientName: req.body.patientName,
      contact: req.body.contact,
      city: req.body.city,
      requiredDate: new Date(req.body.requiredDate),
      requestType: "USER",
      status: "WaitingForMatch"
    });

    return res.status(201).json(request);
  } catch (err) {
    return res.status(500).json({ message: "Error creating request" });
  }
};

/* ================= HISTORY ================= */

const myRequests = async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.user.id })
      .populate("donorId", "username mobileNumber")
      .sort({ createdAt: -1 });

    return res.json(requests);
  } catch {
    return res.status(500).json({ message: "Failed to load history" });
  }
};

/* ================= COMPATIBLE DONORS ================= */

const getCompatibleDonors = async (req, res) => {
  try {
    const mainReq = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $in: ["WaitingForMatch", "Matched"] }
    }).sort({ createdAt: -1 });

    if (!mainReq) return res.json([]);

    const compatibleGroups = getCompatibleGroups(mainReq.bloodGroup);
    const requestCity = mainReq.city.trim().toLowerCase();

    const donors = await Donor.find({
      bloodGroup: { $in: compatibleGroups }
    });

    const today = new Date();

    const eligible = donors.filter(d => {
      if (!d.lastDonationDate) return true;

      const diffDays =
        (today - new Date(d.lastDonationDate)) / (1000 * 60 * 60 * 24);

      return diffDays >= 56;
    });

    // 🔥 SORT: same city first
    eligible.sort((a, b) => {
      const aSame = a.city?.trim().toLowerCase() === requestCity;
      const bSame = b.city?.trim().toLowerCase() === requestCity;

      if (aSame && !bSame) return -1;
      if (!aSame && bSame) return 1;
      return 0;
    });

    return res.json(eligible);

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
/* ================= COMPATIBLE STOCK ================= */

const getCompatibleStock = async (req, res) => {
  try {
    const mainReq = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $in: ["WaitingForMatch", "Matched"] }
    }).sort({ createdAt: -1 });

    if (!mainReq) return res.json([]);

    const compatibleGroups = getCompatibleGroups(mainReq.bloodGroup);

    const stock = await Stock.find({
      bloodGroup: { $in: compatibleGroups },
      units: { $gt: 0 }
    });

    return res.json(stock);
  } catch {
    return res.status(500).json({ message: "Failed to load stock" });
  }
};

/* ================= REQUEST FROM STOCK ================= */

const quickRequestFromStock = async (req, res) => {
  try {
    const { stockId, units } = req.body;
    if (!units || units <= 0)
      return res.status(400).json({ message: "Invalid units" });

    const main = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $in: ["WaitingForMatch", "Matched"] }
    }).sort({ createdAt: -1 });

    if (!main)
      return res.status(400).json({ message: "Create requirement first" });

    const stock = await Stock.findById(stockId);
    if (!stock)
      return res.status(404).json({ message: "Stock not found" });

    if (units > stock.units)
      return res.status(400).json({ message: "Not enough stock units" });

    stock.units -= units;
    await stock.save();

    const child = await Request.create({
      userId: req.user.id,
      stockId,
      bloodGroup: main.bloodGroup,
      units,
      requestType: "ADMIN",
      parentRequestId: main._id,
      status: "Pending",
      requiredDate: main.requiredDate,
      hospital: main.hospital,
      patientName: main.patientName,
      contact: main.contact,
      city: main.city
    });

    main.status = "Matched";
    await main.save();

    return res.json(child);
  } catch {
    return res.status(500).json({ message: "Stock request failed" });
  }
};

/* ================= REQUEST FROM DONOR ================= */

const quickRequestFromDonor = async (req, res) => {
  try {
    const { donorId } = req.body;

    const main = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $in: ["WaitingForMatch", "Matched"] }
    }).sort({ createdAt: -1 });

    if (!main)
      return res.status(400).json({ message: "Create requirement first" });

    const donor = await Donor.findById(donorId);
    if (!donor)
      return res.status(404).json({ message: "Donor not found" });

    if (donor.nextDonationDate && donor.nextDonationDate > new Date())
      return res.status(400).json({ message: "Donor not eligible yet" });

    const busy = await Request.findOne({
      donorId,
      requestType: "DONOR",
      status: { $in: ["Pending", "Accepted"] }
    });

    if (busy)
      return res.status(400).json({ message: "Donor already assigned" });

    const child = await Request.create({
      userId: req.user.id,
      donorId,
      bloodGroup: main.bloodGroup,
      units: 1,
      requestType: "DONOR",
      parentRequestId: main._id,
      status: "Pending",
      requiredDate: main.requiredDate,
      hospital: main.hospital,
      patientName: main.patientName,
      contact: main.contact,
      city: main.city
    });

    main.status = "Matched";
    await main.save();

    return res.json(child);
  } catch {
    return res.status(500).json({ message: "Donor request failed" });
  }
};

/* ================= DONOR ACCEPT ================= */

const donorAcceptRequest = async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.requestId,
      donorId: req.user.id,
      status: "Pending"
    });

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    const donor = await Donor.findById(req.user.id);
    if (!donor)
      return res.status(404).json({ message: "Donor not found" });

    const today = new Date();
    const nextDonation = new Date(today);
    nextDonation.setDate(today.getDate() + 56);

    donor.lastDonationDate = today;
    donor.nextDonationDate = nextDonation;
    await donor.save();

    request.status = "Accepted";
    request.deliveryStatus = "Transiting";
    request.reachDate = request.requiredDate;
    await request.save();

    await Request.findByIdAndUpdate(
      request.parentRequestId,
      { status: "Matched" }
    );

    return res.json({ message: "Accepted successfully" });

  } catch {
    return res.status(500).json({ message: "Accept failed" });
  }
};

/* ================= CANCEL ================= */

const cancelRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (["Completed", "Closed"].includes(request.status))
      return res.status(400).json({ message: "Cannot cancel this request" });

    const user = await User.findById(request.userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (["Pending", "Accepted"].includes(request.status)) {
      user.cancelCount = (user.cancelCount || 0) + 1;
    }

    if (user.cancelCount >= 5) {
      const banDate = new Date();
      banDate.setMonth(banDate.getMonth() + 1);
      user.bannedUntil = banDate;
      user.cancelCount = 0;
    }

    await user.save();

    request.status = "Rejected";
    await request.save();

    if (request.stockId) {
      const stock = await Stock.findById(request.stockId);
      if (stock) {
        stock.units += request.units;
        await stock.save();
      }
    }

    if (request.parentRequestId) {
      const children = await Request.find({
        parentRequestId: request.parentRequestId
      });

      const parent = await Request.findById(request.parentRequestId);

      if (children.every(c => c.status === "Rejected"))
        parent.status = "Rejected";
      else if (children.some(c => c.status === "Accepted"))
        parent.status = "Matched";
      else
        parent.status = "WaitingForMatch";

      await parent.save();
    }

    return res.json({
      message: user.bannedUntil
        ? "Cancelled. User banned for 1 month."
        : `Cancelled. Remaining chances: ${5 - user.cancelCount}`
    });

  } catch {
    return res.status(500).json({ message: "Cancel failed" });
  }
};

const updateArrivalStatus = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    request.deliveryStatus = "Delivered";
    request.status = "Completed";
    await request.save();

    return res.json({ message: "Marked as delivered" });
  } catch {
    return res.status(500).json({ message: "Update failed" });
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