const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Donor = require("../models/Donor");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

const makeToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

/* ================= USER REGISTER ================= */
const userRegister = async (req, res) => {
  try {
    const { username, email, password, mobileNumber, address, age, city } = req.body;

    if (!username || !email || !password || !mobileNumber || !address || !age || !city) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const numericAge = Number(age);
    if (isNaN(numericAge) || numericAge <= 0) {
      return res.status(400).json({ message: "Invalid age value" });
    }

    const exist = await User.findOne({ email: email.toLowerCase().trim() });
    if (exist) return res.status(400).json({ message: "Email already exists" });

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      mobileNumber,
      address: address.trim(),
      age: numericAge,
      city: city.trim(),
    });

    res.json({
      message: "User registered",
      token: makeToken(user._id, "USER"),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "User register failed" });
  }
};

/* ================= DONOR REGISTER ================= */
const donorRegister = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      bloodGroup,
      mobileNumber,
      address,
      age,
      city,
      isNewDonor,
      lastDonationDate
    } = req.body;

    if (
      !username ||
      !email ||
      !password ||
      !bloodGroup ||
      !mobileNumber ||
      !address ||
      !age ||
      !city ||
      isNewDonor === undefined
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const numericAge = Number(age);

    // ✅ AGE VALIDATION
    if (isNaN(numericAge) || numericAge < 18) {
      return res.status(400).json({
        message: "Donor must be at least 18 years old"
      });
    }

    if (numericAge > 60) {
      return res.status(400).json({
        message: "Donor age must be below 60"
      });
    }

    const exist = await Donor.findOne({ email: email.toLowerCase().trim() });
    if (exist) {
      return res.status(400).json({ message: "Email already exists" });
    }

    let donationDate = null;

    // ✅ If NOT new donor → require lastDonationDate
    if (!isNewDonor) {
      if (!lastDonationDate) {
        return res.status(400).json({
          message: "Last donation date is required"
        });
      }

      donationDate = new Date(lastDonationDate);

      const today = new Date();
      const diffDays =
        (today - donationDate) / (1000 * 60 * 60 * 24);

      // ✅ 56-day rule (8 weeks)
      if (diffDays < 56) {
        return res.status(400).json({
          message: "You must wait 56 days between donations"
        });
      }
    }

    const hash = await bcrypt.hash(password, 10);

    const donor = await Donor.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
      bloodGroup,
      mobileNumber,
      address: address.trim(),
      age: numericAge,
      city: city.trim(),
      isNewDonor,
      lastDonationDate: donationDate,
    });

    res.json({
      message: "Donor registered successfully",
      token: makeToken(donor._id, "DONOR"),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Donor register failed" });
  }
};

/* ================= ADMIN LOGIN ================= */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid admin credentials" });
    }

    const token = jwt.sign(
      { role: "ADMIN", username },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ message: "Admin login successful", token });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Admin login failed" });
  }
};

/* ================= COMMON LOGIN ================= */
const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (role === "ADMIN") {
      return res.status(400).json({ message: "Use admin login" });
    }

    const Model = role === "USER" ? User : Donor;

    const user = await Model.findOne({
      email: email.toLowerCase().trim()
    }).select("+password");

    if (!user) return res.status(400).json({ message: "User not found" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Wrong password" });

    res.json({ token: makeToken(user._id, role) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login failed" });
  }
};

module.exports = {
  userRegister,
  donorRegister,
  adminLogin,
  login,
};
