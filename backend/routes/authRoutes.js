const router = require("express").Router();
const c = require("../controllers/authController");

// OTP flow
// router.post("/send-otp", c.sendOtp);                 // send otp to email/phone
// router.post("/verify-otp", c.verifyOtpAndRegister);  // verify otp & create user/donor

// Direct register (optional / fallback)
router.post("/register/user", c.userRegister);
router.post("/register/donor", c.donorRegister);

// Login
router.post("/login", c.login);
router.post("/admin/login", c.adminLogin);

// router.post("/forgot-password", c.forgotPassword);
// router.post("/reset-password/:token", c.resetPassword);

module.exports = router;
