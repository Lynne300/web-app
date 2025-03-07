const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// Route to get user profile
router.get('/:id', userController.getUserProfile);

// Route to update user profile
router.put('/:id', userController.updateUserProfile);

// Route to delete user account
router.delete('/:id', userController.deleteUserAccount);

module.exports = router;