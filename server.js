 const express = require("express");
const connectDB = require("./db");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

// ---------------- CONNECT DB ----------------
connectDB();

// ---------------- AUTH MIDDLEWARE ----------------
const authmiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token not provided" });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email }
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ---------------- BASIC ROUTES ----------------
app.get("/", (req, res) => {
  res.send("Hello from backend");
});

app.get("/about", (req, res) => {
  res.send("About page");
});

// ---------------- REGISTER ----------------
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.log("Register error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.log("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET CURRENT LOGGED-IN USER (/me) ----------------
app.get("/me", authmiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "Current logged-in user",
      user,
    });
  } catch (error) {
    console.log("Me API error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET ALL USERS ----------------
app.get("/users", authmiddleware, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({
      message: "Users fetched successfully",
      users,
    });
  } catch (error) {
    console.log("Fetch error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- GET USER BY ID ----------------
app.get("/users/:id", authmiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User fetched by id",
      user,
    });
  } catch (error) {
    console.log("Get by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- UPDATE USER ----------------
app.put("/users/:id", authmiddleware, async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.log("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- DELETE USER ----------------
app.delete("/users/:id", authmiddleware, async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    console.log("Delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- START SERVER ----------------
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
