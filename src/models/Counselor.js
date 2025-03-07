const mongoose = require("mongoose");

const counselorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  imageUrl: {
    type: String,
    required: true,
  },
  specialty: {
    type: String,
    required: true,
  },
  experience: {
    type: Number,
    required: true,
  },
  bio: {
    type: String,
    required: true,
  },
  qualifications: [
    {
      type: String,
      required: true,
    },
  ],
  isVerified: {
    type: Boolean,
    default: false,
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Counselor", counselorSchema);
