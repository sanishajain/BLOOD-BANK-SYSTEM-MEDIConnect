const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const adminStockRoutes = require("./routes/adminStockRoutes");
const receiverRoutes = require("./routes/receiverRoutes");
const adminRoutes = require("./routes/adminRoutes");
const donorRoutes = require("./routes/donorRoutes");




app.use("/api/auth", authRoutes);
app.use("/api/admin/stocks", adminStockRoutes);
app.use("/api/receivers", receiverRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/donors", donorRoutes);


app.get("/", (req, res) => {
  res.send("Blood Bank API Running");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
