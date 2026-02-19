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


/* ================= CREATE MAIN USER REQUEST ================= */

const createRequest = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({
        message: "You are banned until " + user.bannedUntil.toDateString()
      });
    }

    const request = await Request.create({
      userId: req.user.id,
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

    res.json(request);
  } catch (err) {
    res.status(500).json({ message: "Error creating request" });
  }
};


/* ================= HISTORY ================= */

const myRequests = async (req, res) => {
  try {
    const requests = await Request.find({ userId: req.user.id })
      .populate("donorId", "username mobileNumber")
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch {
    res.status(500).json({ message: "Failed to load history" });
  }
};


/* ================= COMPATIBLE DONORS ================= */

const getCompatibleDonors = async (req, res) => {
  try {
    const mainReq = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $ne: "Closed" }
    }).sort({ createdAt: -1 });

    if (!mainReq) return res.json([]);

    const compatibleGroups = getCompatibleGroups(mainReq.bloodGroup);
    const now = new Date();

    const donors = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
      city: mainReq.city,
      $or: [
        { nextEligibleDate: { $lte: now } },
        { nextEligibleDate: null }
      ]
    });

    const busy = await Request.find({
      requestType: "DONOR",
      status: { $in: ["Pending", "Accepted"] }
    });

    const busyIds = busy.map(r => String(r.donorId));

    const filtered = donors.filter(
      d => !busyIds.includes(String(d._id))
    );

    res.json(filtered);

  } catch {
    res.status(500).json({ message: "Failed to load donors" });
  }
};


/* ================= COMPATIBLE STOCK ================= */

const getCompatibleStock = async (req, res) => {
  try {
    const mainReq = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $ne: "Closed" }
    }).sort({ createdAt: -1 });

    if (!mainReq) return res.json([]);

    const compatibleGroups = getCompatibleGroups(mainReq.bloodGroup);

    const stock = await Stock.find({
      bloodGroup: { $in: compatibleGroups },
      units: { $gt: 0 }
    });

    res.json(stock);

  } catch {
    res.status(500).json({ message: "Failed to load stock" });
  }
};


/* ================= REQUEST FROM STOCK ================= */

const quickRequestFromStock = async (req, res) => {
  try {
    const { stockId, units } = req.body;

    const main = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $ne: "Closed" }
    }).sort({ createdAt: -1 });

    if (!main)
      return res.status(400).json({ message: "Create requirement first" });

    const stock = await Stock.findById(stockId);
    if (!stock)
      return res.status(404).json({ message: "Stock not found" });

    if (units <= 0 || units > stock.units)
      return res.status(400).json({ message: "Invalid stock units" });

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

    res.json(child);
  } catch {
    res.status(500).json({ message: "Stock request failed" });
  }
};


/* ================= REQUEST FROM DONOR ================= */

const quickRequestFromDonor = async (req, res) => {
  try {
    const { donorId } = req.body;

    const main = await Request.findOne({
      userId: req.user.id,
      requestType: "USER",
      status: { $ne: "Closed" }
    }).sort({ createdAt: -1 });

    if (!main)
      return res.status(400).json({ message: "Create requirement first" });

    const existing = await Request.findOne({
      donorId,
      status: { $in: ["Pending", "Accepted"] }
    });

    if (existing)
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

    res.json(child);

  } catch {
    res.status(500).json({ message: "Donor request failed" });
  }
};


/* ================= DONOR ACCEPT ================= */

const donorAcceptRequest = async (req, res) => {
  try {
    const request = await Request.findOne({
      _id: req.params.requestId,
      donorId: req.user.id,
      status: "Pending"
    }).populate("userId", "username contact");

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    const donor = await Donor.findById(req.user.id);

    const today = new Date();
    const nextEligible = new Date(today);
    nextEligible.setDate(nextEligible.getDate() + 56);

    donor.lastDonationDate = today;
    donor.nextEligibleDate = nextEligible;
    await donor.save();

    request.status = "Accepted";
    request.deliveryStatus = "Transiting";
    request.reachDate = request.requiredDate;

    request.donorContact = {
      name: donor.username,
      phone: donor.mobileNumber
    };

    request.userContact = {
      name: request.userId.username,
      phone: request.userId.contact
    };

    await request.save();

    await Request.findByIdAndUpdate(
      request.parentRequestId,
      { status: "Matched" }
    );

    res.json({ message: "Accepted" });

  } catch {
    res.status(500).json({ message: "Accept failed" });
  }
};


/* ================= AUTO ARRIVAL ================= */

const updateArrivalStatus = async () => {
  const now = new Date();

  const arrived = await Request.find({
    reachDate: { $lte: now },
    deliveryStatus: "Transiting",
    status: "Accepted"
  });

  for (let req of arrived) {
    req.deliveryStatus = "Arrived";
    req.status = "Completed";
    await req.save();

    const pending = await Request.find({
      parentRequestId: req.parentRequestId,
      status: { $in: ["Pending", "Accepted"] }
    });

    if (pending.length === 0) {
      await Request.findByIdAndUpdate(
        req.parentRequestId,
        { status: "Closed" }
      );
    }
  }
};


/* ================= CANCEL ================= */

/* ================= CANCEL ================= */

const cancelRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request)
      return res.status(404).json({ message: "Request not found" });

    // Cannot cancel if already completed or closed
    if (["Completed", "Closed"].includes(request.status))
      return res.status(400).json({ message: "Cannot cancel this request" });

    const user = await User.findById(request.userId);
    if (!user)
      return res.status(404).json({ message: "User not found" });

    /* ================= CHECK BAN ================= */

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({
        message: `You are banned until ${user.bannedUntil.toDateString()}`
      });
    }

    /* ================= COUNT CANCELLATION ================= */

    // Count only if request was Accepted or Pending
    if (["Accepted", "Pending"].includes(request.status)) {
      user.cancelCount = (user.cancelCount || 0) + 1;
    }

    /* ================= APPLY BAN IF LIMIT REACHED ================= */

    if (user.cancelCount >= 5) {
      const banDate = new Date();
      banDate.setMonth(banDate.getMonth() + 1);

      user.bannedUntil = banDate;
      user.cancelCount = 0; // reset after ban
    }

    await user.save();

    /* ================= UPDATE REQUEST ================= */

    request.status = "Rejected";
    request.deliveryStatus = "Cancelled";
    await request.save();

    /* ================= RESTORE STOCK ================= */

    if (request.stockId) {
      const stock = await Stock.findById(request.stockId);
      if (stock) {
        stock.units += request.units;
        await stock.save();
      }
    }

    /* ================= UPDATE PARENT STATUS ================= */

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

    /* ================= RESPONSE ================= */

    return res.json({
      message: user.bannedUntil
        ? "Cancelled. You have been banned for 1 month."
        : `Cancelled successfully. Remaining chances: ${5 - user.cancelCount}`,
      cancelCount: user.cancelCount,
      bannedUntil: user.bannedUntil || null
    });

  } catch (err) {
    res.status(500).json({ message: "Cancel failed" });
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
