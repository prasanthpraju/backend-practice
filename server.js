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
const authmiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token not provided" });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Invalid token format" });
  }

  try {
    // 1️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 2️⃣ Check token + login status in DB
    const user = await User.findOne({
      _id: decoded.id,
      "tokens.token": token,
      isLoggedIn: true,
    });

    if (!user) {
      return res.status(401).json({ message: "Session expired" });
    }

    // 3️⃣ Attach user & token
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// ---------------- BASIC ROUTES ----------------
app.get("/", (req, res) => {
  res.send("Hello from backend");
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
      { expiresIn: "1d" },
    );

    // 🔥 SAVE TOKEN + LOGIN STATUS
    user.tokens.push({ token });
    user.isLoggedIn = true;
    await user.save();

    res.json({
      message: "Login successful",
      token,
      isLoggedIn: user.isLoggedIn,
    });
  } catch (error) {
    console.log("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- CURRENT USER (/me) ----------------
app.get("/me", authmiddleware, async (req, res) => {
  res.json({
    message: "Current logged-in user",
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

// ---------------- GET ALL USERS ----------------
app.get("/users", authmiddleware, async (req, res) => {
  const users = await User.find().select("-password -tokens");
  res.json(users);
});
// ---------------- GET USER BY ID ----------------
app.get("/users/:id", authmiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -tokens");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User fetched successfully",
      user,
    });
  } catch (error) {
    console.log("Get user by id error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------------- LOGOUT ----------------
app.post("/logout", authmiddleware, async (req, res) => {
  // 🔥 remove current token
  req.user.tokens = req.user.tokens.filter((t) => t.token !== req.token);

  if (req.user.tokens.length === 0) {
    req.user.isLoggedIn = false;
  }

  await req.user.save();

  res.json({ message: "Logged out successfully" });
});
 
app.put("/users/:id", authmiddleware, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 🔒 Only logged-in user can update his own data
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const updateData = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    // 🔐 Password update (optional)
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select("-password -tokens");

    res.json({
      message: "Profile updated successfully",
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
    // 🔒 Only logged-in user can delete his own account
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: "User account deleted successfully",
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
