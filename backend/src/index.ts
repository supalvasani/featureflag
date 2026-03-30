import express from "express";

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "API working" });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});