const express = require("express");
const router = express.Router();
const Counselor = require("../models/Counselor");
const Admin = require("../models/Admin");

// Admin middleware
const isAdmin = async (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect("/admin/login");
  }
  next();
};

// Admin dashboard
router.get("/dashboard", isAdmin, async (req, res) => {
  try {
    const pendingCounselors = await Counselor.find({ isVerified: false });
    const verifiedCounselors = await Counselor.find({ isVerified: true });

    res.render("admin/dashboard", {
      pendingCounselors,
      verifiedCounselors,
    });
  } catch (error) {
    res.status(500).render("error", { message: "Server error" });
  }
});

// Verify counselor
router.post("/verify/:id", isAdmin, async (req, res) => {
  try {
    await Counselor.findByIdAndUpdate(req.params.id, { isVerified: true });
    res.redirect("/admin/dashboard");
  } catch (error) {
    res.status(500).json({ error: "Verification failed" });
  }
});

module.exports = router;
