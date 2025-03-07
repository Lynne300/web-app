// filepath: /anonymous-web-app/anonymous-web-app/src/controllers/counselorController.js

const Counselor = require('../models/Counselor');

// Get all counselors
exports.getAllCounselors = async (req, res) => {
    try {
        const counselors = await Counselor.find();
        res.status(200).json(counselors);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving counselors', error });
    }
};

// Get counselor by ID
exports.getCounselorById = async (req, res) => {
    const { id } = req.params;
    try {
        const counselor = await Counselor.findById(id);
        if (!counselor) {
            return res.status(404).json({ message: 'Counselor not found' });
        }
        res.status(200).json(counselor);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving counselor', error });
    }
};