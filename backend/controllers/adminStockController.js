const BloodStock = require("../models/BloodStock");

/* Add Stock */
const addStock = async (req, res) => {
  const { bloodGroup, units } = req.body;
  if (!bloodGroup || !units)
    return res.status(400).json({ message: "Missing fields" });

  let stock = await BloodStock.findOne({ bloodGroup });

  if (stock) {
    stock.units += Number(units);
    stock.lastUpdated = new Date();
    await stock.save();
  } else {
    stock = await BloodStock.create({
      bloodGroup,
      units,
      source: "ADMIN",
    });
  }

  res.json({ message: "Stock updated", stock });
};

/* Get All Stock */
const getStocks = async (req, res) => {
  const stocks = await BloodStock.find();
  res.json({ stocks });
};

/* Update Stock */
const updateStock = async (req, res) => {
  const { units } = req.body;
  const stock = await BloodStock.findById(req.params.id);
  if (!stock) return res.status(404).json({ message: "Not found" });

  stock.units = Number(units);
  stock.lastUpdated = new Date();
  await stock.save();

  res.json({ message: "Stock updated", stock });
};

/* Delete Stock */
const deleteStock = async (req, res) => {
  const stock = await BloodStock.findByIdAndDelete(req.params.id);
  if (!stock) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Stock deleted" });
};

module.exports = { addStock, getStocks, updateStock, deleteStock };
