const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO - Updated for Netlify frontend
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", 
      "http://localhost:3000", 
      "http://127.0.0.1:5173", 
      "http://127.0.0.1:3000",
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "https://evobridgevector.netlify.app",
      "https://evobridgevector.netlify.app/",
      "https://*.netlify.app",
      /^https:\/\/.*\.netlify\.app$/
    ],
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true // For compatibility
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173", 
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "https://evobridgevector.netlify.app",
    "https://evobridgevector.netlify.app/",
    "https://*.netlify.app"
  ],
  credentials: true
}));
app.use(express.json());

// Serve static files if needed
app.use(express.static('public'));

// Enhanced data structures for professor-student model
const rooms = new Map(); // roomKey -> { professors: Map, students: Map, commands: [], metadata }
const userSessions = new Map(); // socketId -> { role, name, roomKey, userId }

// Utility functions
function generateRoomKey() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function validateRoomKey(key) {
  if (!key || typeof key !== 'string') return false;
  const cleanKey = key.trim().toUpperCase();
  return cleanKey.length >= 3 && cleanKey.length <= 20 && /^[A-Z0-9]+$/.test(cleanKey);
}

function getRoomStats(roomKey) {
  const room = rooms.get(roomKey);
  if (!room) return { professors: 0, students: 0, total: 0, exists: false };

  return {
    professors: room.professors.size,
    students: room.students.size,
    total: room.professors.size + room.students.size,
    exists: true,
    createdAt: room.metadata.createdAt,
    lastActivity: room.metadata.lastActivity
  };
}

function createRoom(roomKey, creatorInfo) {
  const normalizedKey = roomKey.toUpperCase();
  rooms.set(normalizedKey, {
    professors: new Map(),
    students: new Map(),
    commands: [],
    metadata: {
      createdAt: Date.now(),
      lastActivity: Date.now(),
      createdBy: creatorInfo,
      roomKey: normalizedKey
    }
  });
  return normalizedKey;
}

function logActivity(action, socketId, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${action} | Socket: ${socketId.substring(0, 8)} | Data:`, JSON.stringify(data, null, 2));
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`\n🔌 New connection: ${socket.id.substring(0, 8)}`);

  // Handle professor joining/creating room
  socket.on('join-room-as-professor', (data) => {
    try {
      const { roomKey: inputRoomKey, professorName, createIfNotExists = true } = data;

      if (!professorName || professorName.trim().length === 0) {
        socket.emit('room-error', { 
          message: 'Professor name is required', 
          code: 'INVALID_NAME' 
        });
        return;
      }

      let roomKey = inputRoomKey;

      // Generate room key if not provided
      if (!roomKey && createIfNotExists) {
        roomKey = generateRoomKey();
      }

      if (!validateRoomKey(roomKey)) {
        socket.emit('room-error', { 
          message: 'Invalid room key. Must be 3-20 alphanumeric characters.', 
          code: 'INVALID_ROOM_KEY' 
        });
        return;
      }

      const normalizedRoomKey = roomKey.toUpperCase();

      // Create room if it doesn't exist and professor wants to create it
      if (!rooms.has(normalizedRoomKey)) {
        if (createIfNotExists) {
          createRoom(normalizedRoomKey, { name: professorName, socketId: socket.id });
          logActivity('ROOM_CREATED', socket.id, { roomKey: normalizedRoomKey, professorName });
        } else {
          socket.emit('room-error', { 
            message: `Room ${normalizedRoomKey} does not exist`, 
            code: 'ROOM_NOT_FOUND' 
          });
          return;
        }
      }

      const room = rooms.get(normalizedRoomKey);

      // Check if professor limit reached (max 3 professors per room)
      if (room.professors.size >= 3) {
        socket.emit('room-error', { 
          message: 'Room has reached maximum professor limit', 
          code: 'PROFESSOR_LIMIT_REACHED' 
        });
        return;
      }

      // Join the room
      socket.join(normalizedRoomKey);

      // Add professor to room data
      const professorData = {
        name: professorName.trim(),
        socketId: socket.id,
        joinedAt: Date.now(),
        role: 'professor'
      };

      room.professors.set(socket.id, professorData);
      room.metadata.lastActivity = Date.now();

      // Store user session
      userSessions.set(socket.id, {
        role: 'professor',
        name: professorName.trim(),
        roomKey: normalizedRoomKey,
        userId: socket.id
      });

      // Send success response to professor
      const roomStats = getRoomStats(normalizedRoomKey);
      socket.emit('room-joined', {
        success: true,
        roomKey: normalizedRoomKey,
        role: 'professor',
        userName: professorName.trim(),
        userCount: roomStats.total,
        professors: roomStats.professors,
        students: roomStats.students
      });

      // Send room history to new professor
      if (room.commands.length > 0) {
        socket.emit('room-history', {
          commands: room.commands,
          count: room.commands.length
        });
      }

      // Broadcast updated user list to all users in room
      const userListUpdate = {
        professors: Array.from(room.professors.values()).map(p => ({ name: p.name, id: p.socketId.substring(0, 8) })),
        students: Array.from(room.students.values()).map(s => ({ name: s.name, id: s.socketId.substring(0, 8) })),
        total: room.professors.size + room.students.size
      };

      io.to(normalizedRoomKey).emit('user-list-update', userListUpdate);

      logActivity('PROFESSOR_JOINED', socket.id, { roomKey: normalizedRoomKey, professorName, roomStats });

    } catch (error) {
      console.error(`❌ Error in professor join:`, error);
      socket.emit('room-error', { 
        message: 'Failed to join room as professor', 
        code: 'INTERNAL_ERROR' 
      });
    }
  });

  // Handle student joining room
  socket.on('join-room-as-student', (data) => {
    try {
      const { roomKey: inputRoomKey, studentName } = data;

      if (!studentName || studentName.trim().length === 0) {
        socket.emit('room-error', { 
          message: 'Student name is required', 
          code: 'INVALID_NAME' 
        });
        return;
      }

      if (!validateRoomKey(inputRoomKey)) {
        socket.emit('room-error', { 
          message: 'Invalid room key format', 
          code: 'INVALID_ROOM_KEY' 
        });
        return;
      }

      const normalizedRoomKey = inputRoomKey.toUpperCase();

      // Check if room exists
      if (!rooms.has(normalizedRoomKey)) {
        socket.emit('room-error', { 
          message: `Room ${normalizedRoomKey} does not exist`, 
          code: 'ROOM_NOT_FOUND' 
        });
        return;
      }

      const room = rooms.get(normalizedRoomKey);

      // Check if there's at least one professor in the room
      if (room.professors.size === 0) {
        socket.emit('room-error', { 
          message: 'No professor available in this room', 
          code: 'NO_PROFESSOR' 
        });
        return;
      }

      // Check student limit (max 100 students per room)
      if (room.students.size >= 100) {
        socket.emit('room-error', { 
          message: 'Room has reached maximum student capacity', 
          code: 'STUDENT_LIMIT_REACHED' 
        });
        return;
      }

      // Join the room
      socket.join(normalizedRoomKey);

      // Add student to room data
      const studentData = {
        name: studentName.trim(),
        socketId: socket.id,
        joinedAt: Date.now(),
        role: 'student'
      };

      room.students.set(socket.id, studentData);
      room.metadata.lastActivity = Date.now();

      // Store user session
      userSessions.set(socket.id, {
        role: 'student',
        name: studentName.trim(),
        roomKey: normalizedRoomKey,
        userId: socket.id
      });

      // Send success response to student
      const roomStats = getRoomStats(normalizedRoomKey);
      socket.emit('room-joined', {
        success: true,
        roomKey: normalizedRoomKey,
        role: 'student',
        userName: studentName.trim(),
        userCount: roomStats.total,
        professors: roomStats.professors,
        students: roomStats.students
      });

      // Send room history to new student (read-only)
      if (room.commands.length > 0) {
        socket.emit('room-history', {
          commands: room.commands,
          count: room.commands.length
        });
      }

      // Broadcast updated user list to all users in room
      const userListUpdate = {
        professors: Array.from(room.professors.values()).map(p => ({ name: p.name, id: p.socketId.substring(0, 8) })),
        students: Array.from(room.students.values()).map(s => ({ name: s.name, id: s.socketId.substring(0, 8) })),
        total: room.professors.size + room.students.size
      };

      io.to(normalizedRoomKey).emit('user-list-update', userListUpdate);

      logActivity('STUDENT_JOINED', socket.id, { roomKey: normalizedRoomKey, studentName, roomStats });

    } catch (error) {
      console.error(`❌ Error in student join:`, error);
      socket.emit('room-error', { 
        message: 'Failed to join room as student', 
        code: 'INTERNAL_ERROR' 
      });
    }
  });

  // Handle drawing commands (only from professors)
  socket.on('draw-command', (data) => {
    try {
      const userSession = userSessions.get(socket.id);

      if (!userSession) {
        socket.emit('permission-denied', { message: 'User session not found' });
        return;
      }

      // Only professors can draw
      if (userSession.role !== 'professor') {
        socket.emit('permission-denied', { message: 'Only professors can draw' });
        return;
      }

      const { command } = data;

      if (!command || !command.type || !command.path) {
        console.error('❌ Invalid drawing command:', command);
        return;
      }

      const roomKey = userSession.roomKey;
      const room = rooms.get(roomKey);

      if (!room) {
        socket.emit('room-error', { message: 'Room no longer exists', code: 'ROOM_GONE' });
        return;
      }

      // Add metadata to command
      const enrichedCommand = {
        ...command,
        professorId: socket.id.substring(0, 8),
        professorName: userSession.name,
        timestamp: Date.now(),
        roomKey: roomKey
      };

      // Store command in room history
      room.commands.push(enrichedCommand);
      room.metadata.lastActivity = Date.now();

      // Limit command history to prevent memory issues (keep last 1000 commands)
      if (room.commands.length > 1000) {
        room.commands = room.commands.slice(-1000);
      }

      // Broadcast to all other users in the room (both professors and students)
      socket.broadcast.to(roomKey).emit('draw-command', enrichedCommand);

      logActivity('DRAW_COMMAND', socket.id, {
        roomKey,
        pathLength: command.path ? command.path.length : 0,
        type: command.type
      });

    } catch (error) {
      console.error(`❌ Error processing draw command:`, error);
    }
  });

  // Handle canvas clear (only professors)
  socket.on('clear-canvas', (data) => {
    try {
      const userSession = userSessions.get(socket.id);

      if (!userSession || userSession.role !== 'professor') {
        socket.emit('permission-denied', { message: 'Only professors can clear the canvas' });
        return;
      }

      const roomKey = userSession.roomKey;
      const room = rooms.get(roomKey);

      if (!room) {
        socket.emit('room-error', { message: 'Room no longer exists', code: 'ROOM_GONE' });
        return;
      }

      // Clear room history
      room.commands = [];
      room.metadata.lastActivity = Date.now();

      // Broadcast clear to all users in room
      io.to(roomKey).emit('canvas-cleared', {
        professorId: socket.id.substring(0, 8),
        professorName: userSession.name,
        timestamp: Date.now()
      });

      logActivity('CANVAS_CLEARED', socket.id, { roomKey });

    } catch (error) {
      console.error(`❌ Error clearing canvas:`, error);
    }
  });

  // Handle ping for connection testing
  socket.on('ping', (timestamp) => {
    socket.emit('pong', {
      clientTimestamp: timestamp,
      serverTimestamp: Date.now()
    });
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    try {
      const userSession = userSessions.get(socket.id);

      if (userSession) {
        const { role, name, roomKey } = userSession;
        const room = rooms.get(roomKey);

        if (room) {
          // Remove user from appropriate collection
          if (role === 'professor') {
            room.professors.delete(socket.id);
          } else {
            room.students.delete(socket.id);
          }

          room.metadata.lastActivity = Date.now();

          // If room is empty, schedule it for deletion
          const totalUsers = room.professors.size + room.students.size;
          if (totalUsers === 0) {
            setTimeout(() => {
              if (rooms.has(roomKey)) {
                const roomCheck = rooms.get(roomKey);
                if (roomCheck.professors.size === 0 && roomCheck.students.size === 0) {
                  rooms.delete(roomKey);
                  logActivity('ROOM_DELETED', socket.id, { roomKey, reason: 'empty' });
                }
              }
            }, 30000); // 30 second grace period
          } else {
            // Update remaining users about user list change
            const userListUpdate = {
              professors: Array.from(room.professors.values()).map(p => ({ name: p.name, id: p.socketId.substring(0, 8) })),
              students: Array.from(room.students.values()).map(s => ({ name: s.name, id: s.socketId.substring(0, 8) })),
              total: totalUsers
            };

            socket.broadcast.to(roomKey).emit('user-list-update', userListUpdate);
          }

          logActivity('USER_DISCONNECTED', socket.id, { 
            role, name, roomKey, reason, 
            remainingUsers: totalUsers 
          });
        }

        userSessions.delete(socket.id);
      } else {
        console.log(`🔌 User disconnected: ${socket.id.substring(0, 8)} (no session) - Reason: ${reason}`);
      }
    } catch (error) {
      console.error(`❌ Error handling disconnect:`, error);
    }
  });

  // Handle errors
  socket.on('error', (error) => {
    console.error(`❌ Socket error from ${socket.id.substring(0, 8)}:`, error);
  });
});

// REST API Endpoints

// Health check
app.get('/health', (req, res) => {
  const roomStats = Array.from(rooms.entries()).map(([roomKey, room]) => ({
    roomKey,
    professors: room.professors.size,
    students: room.students.size,
    total: room.professors.size + room.students.size,
    commandCount: room.commands.length,
    lastActivity: room.metadata.lastActivity,
    createdAt: room.metadata.createdAt
  }));

  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    rooms: roomStats,
    totalConnections: io.engine.clientsCount,
    totalRooms: rooms.size,
    totalSessions: userSessions.size
  });
});

// Get room information
app.get('/api/rooms/:roomKey', (req, res) => {
  const roomKey = req.params.roomKey.toUpperCase();

  if (!rooms.has(roomKey)) {
    return res.status(404).json({ 
      error: 'Room not found', 
      roomKey: roomKey 
    });
  }

  const room = rooms.get(roomKey);
  const stats = getRoomStats(roomKey);

  res.json({
    roomKey: roomKey,
    ...stats,
    commandCount: room.commands.length,
    professors: Array.from(room.professors.values()).map(p => ({ 
      name: p.name, 
      id: p.socketId.substring(0, 8),
      joinedAt: p.joinedAt 
    })),
    students: Array.from(room.students.values()).map(s => ({ 
      name: s.name, 
      id: s.socketId.substring(0, 8),
      joinedAt: s.joinedAt 
    }))
  });
});

// List all active rooms
app.get('/api/rooms', (req, res) => {
  const roomList = Array.from(rooms.entries()).map(([roomKey, room]) => ({
    roomKey,
    professors: room.professors.size,
    students: room.students.size,
    total: room.professors.size + room.students.size,
    lastActivity: room.metadata.lastActivity,
    createdAt: room.metadata.createdAt
  }));

  res.json({
    rooms: roomList,
    totalRooms: rooms.size
  });
});

// Periodic cleanup of inactive rooms
setInterval(() => {
  const now = Date.now();
  const maxInactiveTime = 24 * 60 * 60 * 1000; // 24 hours

  for (const [roomKey, room] of rooms.entries()) {
    if (now - room.metadata.lastActivity > maxInactiveTime) {
      const totalUsers = room.professors.size + room.students.size;
      if (totalUsers === 0) {
        rooms.delete(roomKey);
        console.log(`🧹 Cleaned up inactive room: ${roomKey}`);
      }
    }
  }
}, 60 * 60 * 1000); // Run every hour

// Error handling
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`
🚀 Enhanced Teaching Whiteboard Server Started!
📡 Server running on port ${PORT}
🔗 Health check: http://localhost:${PORT}/health
📊 Socket.IO endpoint: ws://localhost:${PORT}
👨‍🏫 Professor-Student model enabled
🔐 Room key authentication active
🕐 Started at: ${new Date().toISOString()}
  `);
});

// Export for testing
module.exports = { app, server, io };
