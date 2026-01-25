const Request = require("../models/Request");
const Donor = require("../models/Donor");

/* =========================
   Donation History ✅ FIXED
========================= */
/* =========================
/* =========================
   Donation History (FULL DETAILS)
========================= */
const history = async (req, res) => {
  try {
    const data = await Request.find({
      donorId: req.user.id,
      status: { $in: ["Accepted", "Closed"] }, // ✅ show meaningful history
    })
      .populate("userId", "username email mobileNumber") // ✅ requester info
      .sort({ updatedAt: -1 });

    const formattedHistory = data.map((r) => ({
      _id: r._id,

      // REQUEST DETAILS
      bloodGroup: r.bloodGroup,
      units: r.units,
      status: r.status,
      neededDate: r.neededDate,
      reachDate: r.reachDate,

      // HOSPITAL DETAILS
      hospital: r.hospital || "N/A",

      // PATIENT / CONTACT
      patientName: r.patientName || "N/A",
      contact: r.contact || "N/A",

      // USER WHO REQUESTED
      requestedBy: r.userId
        ? {
            name: r.userId.username,
            phone: r.userContact?.phone || r.userId.mobileNumber || "N/A",
            email: r.userId.email || "N/A",
          }
        : null,
    }));

    res.json(formattedHistory);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Failed to load history" });
  }
};


/* =========================
   Nearby Requests
========================= */
const nearbyRequests = async (req, res) => {
  try {
    const donor = await Donor.findById(req.user.id);
    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    const data = await Request.find({
      requestType: "USER",
      donorId: null,
      status: "WaitingForMatch",
      bloodGroup: donor.bloodGroup,
      city: donor.city,
    }).sort({ createdAt: -1 });

    res.json(data);
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Failed to load nearby requests" });
  }
};

/* =========================
   Volunteer
========================= */
const volunteer = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.donorId) {
      return res.status(400).json({ message: "Already taken" });
    }

    request.donorId = req.user.id;
    request.status = "Pending";
    await request.save();

    res.json({ message: "You are assigned", request });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Volunteer failed" });
  }
};

/* =========================
   Assigned Requests
========================= */
const assignedRequests = async (req, res) => {
  try {
    const data = await Request.find({
      donorId: req.user.id,
      status: { $in: ["Pending", "Accepted"] },
    })
      .populate("userId", "username mobileNumber email")
      .sort({ createdAt: -1 });

    res.json(data);
  } catch (e) {
    res.status(500).json({ message: "Failed to load assigned requests" });
  }
};

/* =========================
   Accept
========================= */
const acceptRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.donorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "Accepted";
    await request.save();

    const donor = await Donor.findById(req.user.id);
    if (donor) {
      const donationDate = new Date(request.neededDate || new Date());

      donor.lastDonationDate = donationDate;

      const nextEligible = new Date(donationDate);
      nextEligible.setDate(nextEligible.getDate() + 56);

      donor.nextDonationDate = nextEligible;
      await donor.save();
    }

    res.json({ message: "Accepted", request });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Accept failed" });
  }
};

/* =========================
   Reject
========================= */
const rejectRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.donorId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "WaitingForMatch";
    request.donorId = null;
    await request.save();

    res.json({ message: "Rejected", request });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Reject failed" });
  }
};

/* =========================
   Close (Complete Donation)
========================= */
const closeRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request)
      return res.status(404).json({ message: "Request not found" });

    if (request.donorId.toString() !== req.user.id)
      return res.status(403).json({ message: "Unauthorized" });

    if (request.status !== "Accepted")
      return res.status(400).json({ message: "Donation not yet accepted" });

    request.status = "Closed";
    request.reachDate = new Date();
    await request.save();

    const donor = await Donor.findById(req.user.id);
    if (donor) {
      const donationDate = new Date();

      donor.lastDonationDate = donationDate;

      const nextEligible = new Date(donationDate);
      nextEligible.setDate(nextEligible.getDate() + 90);

      donor.nextDonationDate = nextEligible;
      await donor.save();
    }

    res.json({
      message: "Donation completed successfully",
      request,
    });
  } catch {
    res.status(500).json({ message: "Close failed" });
  }
};

/* =========================
   Profile
========================= */
const getProfile = async (req, res) => {
  try {
    const donor = await Donor.findById(req.user.id).select("-password");
    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    const latestRequest = await Request.findOne({
      donorId: req.user.id,
      status: { $in: ["Accepted", "Closed"] },
    }).sort({ neededDate: -1 });

    let baseDate = latestRequest?.neededDate || donor.lastDonationDate;

    let nextEligibleDate = null;
    if (baseDate) {
      nextEligibleDate = new Date(baseDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 56);
    }

    res.json({
      username: donor.username,
      bloodGroup: donor.bloodGroup,
      mobileNumber: donor.mobileNumber,
      city: donor.city,
      lastDonationDate: baseDate,
      nextDonationDate: nextEligibleDate,
    });
  } catch (e) {
    res.status(500).json({ message: "Failed to load profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { username, mobileNumber, city } = req.body;
    const donor = await Donor.findById(req.user.id);
    if (!donor) {
      return res.status(404).json({ message: "Donor not found" });
    }

    if (username) donor.username = username;
    if (mobileNumber) donor.mobileNumber = mobileNumber;
    if (city) donor.city = city;

    await donor.save();
    res.json({ message: "Profile updated" });
  } catch (e) {
    res.status(500).json({ message: "Update failed" });
  }
};

module.exports = {
  history,
  nearbyRequests,
  volunteer,
  assignedRequests,
  acceptRequest,
  rejectRequest,
  closeRequest,
  getProfile,
  updateProfile,
};
