const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Route to send a message
router.post('/send', chatController.sendMessage);

// Route to get chat history
router.get('/history/:userId', chatController.getChatHistory);

module.exports = router;