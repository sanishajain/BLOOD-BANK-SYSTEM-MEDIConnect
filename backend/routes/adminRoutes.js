const router = require("express").Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");

router.get("/requests", auth, adminController.getAllRequests);
router.post("/approve-request/:id", auth, adminController.approveRequest);
router.post("/reject-request/:id", auth, adminController.rejectRequest);
router.get("/users", auth, adminController.getAllUsers);
router.get("/donors", auth, adminController.getAllDonors);
router.delete("/cancel-request/:id", auth, adminController.cancelRequest);
router.post("/ban-user/:userId", auth, adminController.approveBan);
module.exports = router;
