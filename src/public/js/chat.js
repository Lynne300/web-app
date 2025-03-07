const socket = io();

// DOM Elements
const usersList = document.getElementById("usersList");
const onlineCount = document.getElementById("onlineCount");
const currentUserSpan = document.getElementById("currentUser");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const chatArea = document.querySelector(".chat-area");

// Chat state
let username = "";
let currentChatPartner = null;
let currentRoom = null;

// Initialize when document loads
document.addEventListener("DOMContentLoaded", () => {
  initializeChat();
});

async function initializeChat() {
  // Get username from session data
  username = currentUserSpan.textContent;
  if (!username) {
    showError("No user session found");
    return;
  }

  // Join chat
  socket.emit("userJoin", username);
  setupEventListeners();
}

function setupEventListeners() {
  // Chat form submission
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();

    if (text && currentChatPartner) {
      const messageData = {
        text,
        recipient: currentChatPartner,
        roomId: currentRoom,
      };

      socket.emit("chatMessage", messageData);

      // Remove immediate UI update since server will emit back
      messageInput.value = "";
      messageInput.focus();
    }
  });

  // Socket events
  socket.on("userStatus", ({ user, status, onlineUsers }) => {
    // Filter out duplicate users
    const uniqueUsers = [...new Set(onlineUsers)];
    updateUsersList(uniqueUsers);

    if (user === currentChatPartner && status === "offline") {
      appendSystemMessage(`${user} has gone offline`);
    }
  });

  socket.on("message", handleMessage);

  socket.on("chatRequest", ({ from }) => {
    currentChatPartner = from;
    currentRoom = [username, from].sort().join("_");
    startChat(from);
  });

  socket.on("chatEstablished", ({ roomId, participants }) => {
    currentRoom = roomId;
    const partner = participants.find((p) => p !== username);
    if (partner) {
      currentChatPartner = partner;
      startChat(partner);
    }
  });
}

function updateUsersList(onlineUsers) {
  const filteredUsers = onlineUsers.filter((user) => user !== username);
  onlineCount.textContent = filteredUsers.length;

  usersList.innerHTML = filteredUsers
    .map(
      (user) => `
            <li class="user-item online" data-username="${user}">
                <div class="user-info">
                    <span class="username">${user}</span>
                    <span class="status-dot online"></span>
                </div>
                <button onclick="initiateChat('${user}')" class="chat-btn">
                    Chat
                </button>
            </li>
        `
    )
    .join("");
}

function startChat(partner) {
  currentChatPartner = partner;

  // Show chat interface
  chatArea.classList.remove("hidden");
  chatForm.classList.remove("hidden");

  // Update or create chat header
  let header = document.querySelector(".chat-header");
  if (!header) {
    header = document.createElement("div");
    header.className = "chat-header";
    chatArea.insertBefore(header, chatMessages);
  }

  header.innerHTML = `
        <div class="chat-partner-info">
            <h3>Chatting with ${partner}</h3>
            <span class="status-dot online"></span>
        </div>
        <button onclick="endChat()" class="end-chat-btn">End Chat</button>
    `;

  chatMessages.innerHTML = "";
  messageInput.focus();
}

// Add a debounce function to prevent rapid message sending
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Update message handler to prevent duplicates
const handleMessage = debounce((message) => {
  if (!message.messageId) {
    message.messageId = Date.now() + Math.random();
  }

  // Check if message already exists
  const existingMessage = document.querySelector(
    `[data-message-id="${message.messageId}"]`
  );
  if (existingMessage) return;

  appendMessage(message);
}, 100);

// Update appendMessage function
function appendMessage(message) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${
    message.sender === username ? "message-outgoing" : "message-incoming"
  }`;
  messageDiv.setAttribute("data-message-id", message.messageId);

  messageDiv.innerHTML = `
    <div class="message-content">
      <span class="sender">${
        message.sender === username ? "You" : message.sender
      }</span>
      <p class="text">${message.text}</p>
      <span class="timestamp">${
        message.timestamp || new Date().toLocaleTimeString()
      }</span>
    </div>
  `;

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function appendSystemMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "message message-system";
  messageDiv.innerHTML = `
        <div class="message-content">
            <p class="text">${text}</p>
        </div>
    `;
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Global functions for HTML onclick handlers
window.initiateChat = function (partner) {
  currentChatPartner = partner;
  currentRoom = [username, partner].sort().join("_");
  socket.emit("initiateChatRequest", { to: partner });
  startChat(partner);
};

window.endChat = function () {
  socket.emit("endChat", { partner: currentChatPartner, roomId: currentRoom });
  currentChatPartner = null;
  currentRoom = null;
  chatArea.classList.add("hidden");
  chatForm.classList.add("hidden");
  chatMessages.innerHTML = "";
  const header = document.querySelector(".chat-header");
  if (header) header.remove();
};

function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  errorDiv.textContent = message;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}
