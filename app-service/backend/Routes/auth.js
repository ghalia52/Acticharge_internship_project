// =====================================================
// Routes/auth.js - CORRECTED VERSION (clean login)
// =====================================================
const express = require("express");
const router = express.Router();
const user = require("../Models/user");

// Register a new user
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Input validation
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        message: "All fields are required: firstName, lastName, email, and password"
      });
    }

    // Email format validation (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Password strength validation (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Create new user (this will handle duplicate email check and password hashing)
    const newUser = await user.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password
    });

    // Return sanitized user data (without password)
    res.status(201).json({
      message: "User registered successfully",
      user: user.sanitizeUser(newUser)
    });

  } catch (err) {
    console.error("Registration error:", err.message);
    
    // Handle specific error cases
    if (err.message.includes("User already exists")) {
      return res.status(400).json({ message: "User already exists with this email" });
    }
    
    if (err.message.includes("Missing required fields")) {
      return res.status(400).json({ message: err.message });
    }

    // Generic server error
    res.status(500).json({ message: "Server error during registration" });
  }
});

// Login existing user - CLEAN VERSION (no database updates)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find user by email
    const foundUser = await user.findByEmail(email.trim().toLowerCase());
    if (!foundUser) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password, foundUser.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Login successful - return user data immediately
    res.status(200).json({
      message: "Login successful",
      user: user.sanitizeUser(foundUser),
      loginTime: new Date().toISOString()
    });

    // Optional: Track login activity asynchronously (won't block login response)
    user.updateLogin(foundUser.id, foundUser.email).catch(err => {
      console.error('Login activity tracking failed (non-critical):', err.message);
    });

  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error during login" });
  }
});

// GET user profile by ID
router.get("/:id", async (req, res) => {
  try {
    const foundUser = await user.findById(req.params.id);
    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user.sanitizeUser(foundUser));
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET all users (admin functionality)
router.get("/", async (req, res) => {
  try {
    const offset = parseInt(req.query.offset) || 0;
    const limit = parseInt(req.query.limit) || 50;
    
    const users = await user.getAll(offset, limit);
    const sanitizedUsers = users.map(u => user.sanitizeUser(u));
    res.json(sanitizedUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;