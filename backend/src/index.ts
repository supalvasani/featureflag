import express from "express";
import connectDB from "./db/mongo"; 

const app = express();
app.use(express.json());

// Connect to Database
connectDB();

app.get("/", (req, res) => {
  res.json({ message: "API working with MongoDB" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});