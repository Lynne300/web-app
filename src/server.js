const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const mongoose = require("mongoose");
const path = require("path");
const session = require("express-session");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Import models
const User = require("./models/User");
const Message = require("./models/messsage");

// Add these lines
const counselorRoutes = require("./routes/counselor");
const adminRoutes = require("./routes/admin");

const activeUsers = new Map(); // stores socket.id -> username
const userSockets = new Map(); // stores username -> socket.id
const userSessions = new Map(); // stores username -> session data

const mongoUri =
  "mongodb+srv://drillergeeks:simon@connect.hai8b.mongodb.net/anonymous-support?retryWrites=true&w=majority&appName=connect";

let isDbConnected = false;

// MongoDB Atlas connection
const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB Atlas");
    isDbConnected = true;

    // Reset all users to inactive on server start
    await User.updateMany({}, { isActive: false });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};

// Middleware
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

// Add auth middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

// Update the chat route to properly handle online status
app.get("/chat", requireAuth, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.session.user.id } },
      "username isActive lastSeen"
    );
    const onlineUsers = Array.from(activeUsers.values());

    res.render("chat", {
      currentUser: req.session.user,
      users: users.map((user) => ({
        ...user.toObject(),
        isOnline: onlineUsers.includes(user.username),
      })),
      activeCount: onlineUsers.length,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.render("chat", {
      currentUser: req.session.user,
      users: [],
      activeCount: 0,
    });
  }
});

app.get("/counselors", async (req, res) => {
  try {
    const counselors = await Counselor.find({}).sort({ rating: -1 });
    res.render("counselors", { counselors });
  } catch (error) {
    console.error("Error fetching counselors:", error);
    res.status(500).render("error", { message: "Failed to load counselors" });
  }
});

// Add these routes
app.get("/terms", (req, res) => {
  res.render("legal/terms");
});

app.get("/privacy", (req, res) => {
  res.render("legal/privacy");
});

// Auth routes
app.get("/auth/login", (req, res) => {
  res.render("auth/login");
});

app.get("/auth/signup", (req, res) => {
  res.render("auth/signup");
});

app.post("/auth/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.render("auth/signup", {
        error: "Username or email already exists",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password, // Note: In a real app, you should hash the password
      isActive: true,
    });

    await user.save();
    res.redirect("/auth/login");
  } catch (error) {
    console.error("Registration error:", error);
    res.render("auth/signup", {
      error: "Registration failed. Please try again.",
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.password !== password) {
      return res.render("auth/login", {
        error: "Invalid email or password",
      });
    }

    // Store user data in session
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
    };

    // Update user status
    await User.findByIdAndUpdate(user._id, {
      isActive: true,
      lastSeen: new Date(),
    });

    res.redirect("/chat");
  } catch (error) {
    console.error("Login error:", error);
    res.render("auth/login", {
      error: "Login failed. Please try again.",
    });
  }
});

app.get("/auth/logout", async (req, res) => {
  const { username } = req.query;
  try {
    if (username) {
      const socketId = userSockets.get(username);
      if (socketId) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          await handleUserDisconnect(socket, username);
          socket.disconnect(true);
        }
      }
    }
    res.redirect("/");
  } catch (error) {
    console.error("Logout error:", error);
    res.redirect("/");
  }
});

// Use routes
app.use("/counselor", counselorRoutes);
app.use("/admin", adminRoutes);

// Update the socket connection handler
io.on("connection", async (socket) => {
  console.log("New WebSocket connection:", socket.id);

  // Handle initial connection check
  socket.on("checkConnection", () => {
    if (isDbConnected) {
      socket.emit("serverReady");
    } else {
      socket.emit("error", "Database not connected");
    }
  });

  // Verify user existence and status
  socket.on("verifyUser", async (username, callback) => {
    try {
      if (!isDbConnected) {
        callback({ success: false, error: "Database not connected" });
        return;
      }

      const existingUser = await User.findOne({ username });
      const isUserActive = Array.from(activeUsers.values()).includes(username);

      if (isUserActive) {
        callback({ success: false, error: "User already active" });
        return;
      }

      callback({ success: true });
    } catch (err) {
      console.error("Error verifying user:", err);
      callback({ success: false, error: "Verification failed" });
    }
  });

  socket.on("userJoin", async (username) => {
    try {
      if (!username) {
        socket.emit("error", "Username is required");
        return;
      }

      // Check if user is already connected
      const existingSocketId = userSockets.get(username);
      if (existingSocketId && existingSocketId !== socket.id) {
        // Disconnect existing session
        const existingSocket = io.sockets.sockets.get(existingSocketId);
        if (existingSocket) {
          existingSocket.emit("forceDisconnect", {
            message: "New session started from another location",
          });
          existingSocket.disconnect(true);
        }

        // Clean up old session
        activeUsers.delete(existingSocketId);
        userSockets.delete(username);
      }

      console.log(`User ${username} joining with socket ${socket.id}`);

      // Update user status in database
      await User.findOneAndUpdate(
        { username },
        {
          isActive: true,
          lastSeen: new Date(),
          socketId: socket.id,
        },
        { upsert: true, new: true }
      );

      // Store socket information
      socket.username = username;
      activeUsers.set(socket.id, username);
      userSockets.set(username, socket.id);

      // Get unique online users
      const uniqueOnlineUsers = [...new Set(Array.from(activeUsers.values()))];

      // Broadcast to all clients
      io.emit("userStatus", {
        user: username,
        status: "online",
        onlineUsers: uniqueOnlineUsers,
      });
    } catch (err) {
      console.error("Error in userJoin:", err);
      socket.emit("error", "Failed to join chat");
    }
  });

  // Add a heartbeat mechanism to keep track of active connections
  socket.on("heartbeat", () => {
    const username = activeUsers.get(socket.id);
    if (username && userSessions.has(username)) {
      userSessions.get(username).lastActivity = new Date();
    }
  });

  // Handle user logout explicitly
  socket.on("logout", async () => {
    try {
      const username = activeUsers.get(socket.id);
      if (username) {
        await handleUserDisconnect(socket, username);
        socket.emit("logoutSuccess");
      }
    } catch (err) {
      console.error("Error in logout:", err);
      socket.emit("error", "Failed to logout");
    }
  });

  // Update message handling
  socket.on("chatMessage", async ({ text, recipient, roomId }) => {
    try {
      const sender = activeUsers.get(socket.id);
      if (!sender || !recipient) return;

      const messageData = {
        sender,
        text,
        timestamp: new Date().toLocaleTimeString(),
        messageId: Date.now() + Math.random(),
      };

      // Send to recipient
      const recipientSocketId = userSockets.get(recipient);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("message", messageData);
      }

      // Send back to sender
      socket.emit("message", messageData);
    } catch (err) {
      console.error("Error sending message:", err);
      socket.emit("error", "Failed to send message");
    }
  });

  // Handle chat requests
  socket.on("initiateChatRequest", async ({ to }) => {
    try {
      const from = activeUsers.get(socket.id);
      const recipientSocketId = userSockets.get(to);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit("chatRequest", { from });
      }
    } catch (err) {
      console.error("Error initiating chat:", err);
      socket.emit("error", "Failed to initiate chat");
    }
  });

  socket.on("chatRequestResponse", async ({ to, accepted }) => {
    try {
      const from = activeUsers.get(socket.id);
      const recipientSocketId = userSockets.get(to);

      if (accepted) {
        const roomId = [from, to].sort().join("_");
        socket.join(roomId);

        if (recipientSocketId) {
          io.sockets.sockets.get(recipientSocketId)?.join(roomId);
          io.to(roomId).emit("chatEstablished", {
            roomId,
            participants: [from, to],
          });
        }
      } else {
        io.to(recipientSocketId).emit("chatDeclined", { from });
      }
    } catch (err) {
      console.error("Error handling chat response:", err);
      socket.emit("error", "Failed to process chat response");
    }
  });

  // Update disconnect handler
  socket.on("disconnect", async () => {
    try {
      const username = activeUsers.get(socket.id);
      if (username) {
        await handleUserDisconnect(socket, username);
      }
    } catch (err) {
      console.error("Error in disconnect:", err);
    }
  });
});

// Add this helper function for handling disconnections
async function handleUserDisconnect(socket, username) {
  // Update user status in database
  await User.findOneAndUpdate(
    { username },
    {
      isActive: false,
      lastSeen: new Date(),
    }
  );

  // Clean up session data
  activeUsers.delete(socket.id);
  userSockets.delete(username);
  userSessions.delete(username);

  // Notify other users
  const onlineUsers = Array.from(activeUsers.values());
  io.emit("userStatus", {
    user: username,
    status: "offline",
    onlineUsers,
  });
}

// Add a session cleanup interval
setInterval(async () => {
  const inactivityTimeout = 5 * 60 * 1000; // 5 minutes
  const now = new Date();

  for (const [username, session] of userSessions.entries()) {
    if (now - session.lastActivity > inactivityTimeout) {
      const socket = io.sockets.sockets.get(session.socketId);
      if (socket) {
        await handleUserDisconnect(socket, username);
        socket.emit("sessionExpired", {
          message: "Session expired due to inactivity",
        });
        socket.disconnect(true);
      }
    }
  }
}, 60000); // Check every minute

const PORT = process.env.PORT || 3000;

// Start server only after database connection
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
