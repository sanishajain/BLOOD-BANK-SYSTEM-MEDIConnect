// routes/adminStockRoutes.js
const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const ctrl = require("../controllers/adminStockController");

router.post("/add-stock", adminAuth, ctrl.addStock);
router.get("/stock", adminAuth, ctrl.getStocks);
router.put("/update-stock/:id", adminAuth, ctrl.updateStock);
router.delete("/delete-stock/:id", adminAuth, ctrl.deleteStock);

module.exports = router;
