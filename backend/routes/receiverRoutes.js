const router = require("express").Router();
const auth = require("../middleware/auth");
const c = require("../controllers/receiverController");

router.post("/request-blood", auth, c.createRequest);
router.get("/history", auth, c.myRequests);
router.get("/compatible-donors", auth, c.getCompatibleDonors);
router.get("/compatible-stock", auth, c.getCompatibleStock);
router.post("/request-from-stock", auth, c.quickRequestFromStock);
router.post("/request-from-donor", auth, c.quickRequestFromDonor);
router.put("/update-arrival-status/:id", auth, c.updateArrivalStatus);
router.delete("/cancel/:id", auth, c.cancelRequest);

module.exports = router;
