const express = require("express");
const connectDB = require("./db");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.send("hello from backend");
});

app.get("/about", (req, res) => {
  res.send("hello");
});

app.get("/user", (req, res) => {
  res.json({
    name: "prasanth",
    age: 24,
    role: "developer",
  });
});

app.post("/login",async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findone({email})

  if(!user){
    return res.status(400).json({message:"user not availabe"})
  }

  const ismatched = await bcrypt.compare(password,user.password)

  if(!ismatched){
    return res.status(400).json({message:"worng password"})
  }

  res.json({
    message:"login sucessful",
    user:{
      id:user._id,
      name:user.name,
      email:user.email

    }
  })

  res.json({
    message: "login data received",
    email,
    password,
  });
});

app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();
    res.json({ message: "User registered successfully"})

  } catch (error) {
    console.log("Register error:", error);
    res.status(500).json({ message: "server error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await User.find();
    res.json({
      message: "user fetched successfully",
      users: users,
    });
  } catch (error) {
    console.log("error");
    res.status(500).json({ message: "server error" });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });

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

app.delete("/users/:id", async (req, res) => {
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
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(5000, () => {
  console.log("app running on port 5000");
});
