const router = require("express").Router();
const auth = require("../middleware/auth");

const {
  history,
  nearbyRequests,
  volunteer,
  assignedRequests,
  acceptRequest,
  rejectRequest,
  closeRequest,
  getProfile,
  updateProfile
} = require("../controllers/donorController");

/* Donation history */
router.get("/history", auth, history);

/* Nearby requests */
router.get("/requests", auth, nearbyRequests);

/* Volunteer */
router.post("/volunteer/:id", auth, volunteer);

/* Assigned */
router.get("/assigned", auth, assignedRequests);

/* Actions */
router.post("/accept/:id", auth, acceptRequest);
router.post("/reject/:id", auth, rejectRequest);
router.post("/close/:id", auth, closeRequest);

/* Profile */
router.get("/profile", auth, getProfile);
router.put("/update-profile", auth, updateProfile);

module.exports = router;
