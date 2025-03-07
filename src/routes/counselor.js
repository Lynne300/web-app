const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const Counselor = require("../models/Counselor");
const counselorController = require("../controllers/counselorController");

// Route to get all counselors
router.get("/", counselorController.getAllCounselors);

// Route to get a specific counselor by ID
router.get("/:id", counselorController.getCounselorById);

// Counselor registration page
router.get("/register", (req, res) => {
  res.render("counselor/register");
});

// Counselor registration handler
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      imageUrl,
      specialty,
      experience,
      bio,
      qualifications,
    } = req.body;

    // Check if counselor already exists
    const existingCounselor = await Counselor.findOne({ email });
    if (existingCounselor) {
      return res.status(400).render("counselor/register", {
        error: "Email already registered",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new counselor
    const counselor = new Counselor({
      name,
      email,
      password: hashedPassword,
      imageUrl,
      specialty,
      experience,
      bio,
      qualifications: qualifications.split(",").map((q) => q.trim()),
    });

    await counselor.save();

    res.redirect("/counselor/pending");
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).render("counselor/register", {
      error: "Registration failed",
    });
  }
});

module.exports = router;
