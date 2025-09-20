const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
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
            "https://*.netlify.app/"
        ],
        methods: ["GET", "POST"],
        credentials: true,
        allowedHeaders: ["Content-Type"],
        transports: ['websocket', 'polling'],
        allowEIO3: true // For compatibility
    }
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
const rooms = new Map(); // roomKey -> { professor: socketId, students: Set, history: [], userCount: number }
const userSessions = new Map(); // socketId -> { role, name, roomKey, userId }

// Debug session tracking for mobile issues
const debugSessionLog = new Map(); // socketId -> {connectTime, lastActivity, events: []}

// Activity logging function
function logActivity(action, socketId, data) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${action} - Socket: ${socketId?.substring(0, 8)} - Data:`, data);
    
    // Track session activities for mobile debugging
    if (socketId) {
        if (!debugSessionLog.has(socketId)) {
            debugSessionLog.set(socketId, {
                connectTime: timestamp,
                lastActivity: timestamp,
                events: []
            });
        }
        
        const sessionLog = debugSessionLog.get(socketId);
        sessionLog.lastActivity = timestamp;
        sessionLog.events.push([action, timestamp, data]);
        
        // Limit events to prevent memory issues
        if (sessionLog.events.length > 50) {
            sessionLog.events = sessionLog.events.slice(-30);
        }
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: Date.now(), 
        uptime: process.uptime(),
        connections: io.engine.clientsCount
    });
});

// Mobile connection health check
app.get('/api/health-check', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: Date.now(),
        uptime: process.uptime(),
        connections: io.engine.clientsCount,
        rooms: rooms.size,
        userSessions: userSessions.size
    });
});

// Debug API endpoints for mobile troubleshooting
app.get('/debug/sessions', (req, res) => {
    const sessionInfo = [];
    for (const [socketId, session] of userSessions.entries()) {
        sessionInfo.push({
            socketId: socketId.substring(0, 8) + '...',
            ...session,
            connected: io.sockets.sockets.has(socketId)
        });
    }
    res.json({
        totalSessions: userSessions.size,
        sessions: sessionInfo
    });
});

// Get specific session details
app.get('/debug/sessions/:socketId', (req, res) => {
    const socketId = req.params.socketId;
    
    // Find session by partial socket ID
    let fullSocketId = null;
    for (const [id] of userSessions.entries()) {
        if (id.includes(socketId) || id.startsWith(socketId)) {
            fullSocketId = id;
            break;
        }
    }
    
    if (fullSocketId && userSessions.has(fullSocketId)) {
        const session = userSessions.get(fullSocketId);
        const debugLog = debugSessionLog.get(fullSocketId);
        
        res.json({
            socketId: fullSocketId,
            session: session,
            connected: io.sockets.sockets.has(fullSocketId),
            debugLog: debugLog || null
        });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Get all debug logs
app.get('/debug/logs', (req, res) => {
    const logs = {};
    for (const [socketId, log] of debugSessionLog.entries()) {
        logs[socketId.substring(0, 8) + '...'] = log;
    }
    res.json(logs);
});

// Emergency permission bypass for testing
app.post('/debug/bypass-permissions/:socketId', (req, res) => {
    const socketId = req.params.socketId;
    
    console.log(`DEBUG: Permission bypass requested for socket ${socketId}`);
    
    // Find the full socket ID
    let fullSocketId = null;
    for (const [id] of userSessions.entries()) {
        if (id.includes(socketId) || id.startsWith(socketId)) {
            fullSocketId = id;
            break;
        }
    }
    
    if (fullSocketId) {
        const session = userSessions.get(fullSocketId);
        if (session) {
            session.role = 'professor'; // Force professor role
            console.log(`DEBUG: Forced professor role for socket ${socketId}`);
            logActivity('PERMISSION_BYPASS', fullSocketId, { newRole: 'professor' });
            
            res.json({
                success: true,
                message: `Permission bypassed for socket ${socketId}`,
                session: session
            });
        } else {
            res.status(404).json({ error: 'Session found but no data' });
        }
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    logActivity('CLIENT_CONNECTED', socket.id, {
        userAgent: socket.handshake.headers['user-agent'],
        origin: socket.handshake.headers.origin,
        transport: socket.conn.transport.name
    });

    // Mobile detection and logging
    const userAgent = socket.handshake.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const origin = socket.handshake.headers.origin;
    
    console.log(`New client connected: ${socket.id.substring(0, 8)}`);
    console.log(`  Mobile detected: ${isMobile}`);
    console.log(`  User Agent: ${userAgent.substring(0, 100)}...`);
    console.log(`  Origin: ${origin}`);
    console.log(`  Transport: ${socket.conn.transport.name}`);

    // Enhanced join-room-as-professor with mobile support and debugging
    socket.on('join-room-as-professor', (data) => {
        try {
            console.log(`JOIN-ROOM-AS-PROFESSOR attempt ${data.attemptNumber || 0} from socket ${socket.id.substring(0, 8)}`);
            console.log('Request data:', JSON.stringify(data, null, 2));
            
            // Enhanced mobile detection and logging
            const userAgent = socket.handshake.headers['user-agent'] || data.userAgent || '';
            const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent) || data.isMobile;
            console.log('Mobile client detected:', isMobile);
            console.log('Attempt number:', data.attemptNumber || 0);
            
            logActivity('JOIN_PROFESSOR_ATTEMPT', socket.id, {
                ...data,
                isMobile,
                userAgent: userAgent.substring(0, 100)
            });

            // Send immediate acknowledgment for mobile clients
            socket.emit('join-attempt-received', {
                attemptNumber: data.attemptNumber || 0,
                timestamp: Date.now(),
                isMobile: isMobile
            });

            if (!data.professorName || !data.roomKey) {
                const error = { message: 'Professor name and room key are required', code: 'MISSING_DATA' };
                console.error('PROFESSOR JOIN ERROR:', error.message);
                logActivity('JOIN_PROFESSOR_ERROR', socket.id, error);
                socket.emit('room-error', error);
                return;
            }

            const professorName = data.professorName.trim();
            const roomKey = data.roomKey.trim().toUpperCase();

            console.log(`Professor ${professorName} attempting to join room ${roomKey}`);
            
            // Validate professor name
            if (professorName.length < 1 || professorName.length > 50) {
                const error = { message: 'Professor name must be 1-50 characters', code: 'INVALID_NAME' };
                console.error('PROFESSOR JOIN ERROR:', error.message);
                logActivity('JOIN_PROFESSOR_ERROR', socket.id, error);
                socket.emit('room-error', error);
                return;
            }

            // Validate room key  
            if (roomKey.length < 3 || roomKey.length > 20) {
                const error = { message: 'Room key must be 3-20 characters', code: 'INVALID_ROOM_KEY' };
                console.error('PROFESSOR JOIN ERROR:', error.message);
                logActivity('JOIN_PROFESSOR_ERROR', socket.id, error);
                socket.emit('room-error', error);
                return;
            }

            // Check if room exists or create it
            if (!rooms.has(roomKey)) {
                if (data.createIfNotExists) {
                    rooms.set(roomKey, {
                        professor: socket.id,
                        students: new Set(),
                        history: [],
                        userCount: 1,
                        createdAt: Date.now(),
                        createdBy: professorName
                    });
                    console.log(`Room ${roomKey} created by professor ${professorName}`);
                    logActivity('ROOM_CREATED', socket.id, { roomKey, professorName });
                } else {
                    const error = { message: `Room ${roomKey} does not exist`, code: 'ROOM_NOT_FOUND' };
                    console.error('PROFESSOR JOIN ERROR:', error.message);
                    logActivity('JOIN_PROFESSOR_ERROR', socket.id, error);
                    socket.emit('room-error', error);
                    return;
                }
            } else {
                const room = rooms.get(roomKey);
                if (room.professor && room.professor !== socket.id) {
                    const error = { message: 'Another professor is already in this room', code: 'PROFESSOR_EXISTS' };
                    console.error('PROFESSOR JOIN ERROR:', error.message);
                    logActivity('JOIN_PROFESSOR_ERROR', socket.id, error);
                    socket.emit('room-error', error);
                    return;
                }
                
                // Update room with new professor
                room.professor = socket.id;
                room.userCount = 1 + room.students.size;
                console.log(`Professor ${professorName} joined existing room ${roomKey}`);
            }

            // Join the socket room
            socket.join(roomKey);
            console.log(`Socket ${socket.id.substring(0, 8)} joined room: ${roomKey}`);

            // Store user session with enhanced data
            const userSession = {
                role: 'professor',
                name: professorName.trim(),
                roomKey: roomKey,
                userId: socket.id,
                joinedAt: Date.now(),
                isMobile: isMobile,
                userAgent: userAgent.substring(0, 200)
            };
            
            userSessions.set(socket.id, userSession);
            console.log('User session stored successfully');
            console.log('Session details:', JSON.stringify(userSession, null, 2));
            
            logActivity('JOIN_PROFESSOR_SUCCESS', socket.id, {
                roomKey,
                professorName,
                userCount: rooms.get(roomKey).userCount
            });

            const room = rooms.get(roomKey);

            // Send success response with enhanced data
            const responseData = {
                success: true,
                roomKey: roomKey,
                userCount: room.userCount,
                role: 'professor',
                message: `Successfully joined room ${roomKey} as professor`,
                timestamp: Date.now(),
                isMobile: isMobile,
                attemptNumber: data.attemptNumber || 0
            };

            console.log('Sending room-joined success:', responseData);
            socket.emit('room-joined', responseData);

            // Send room history to professor
            if (room.history.length > 0) {
                console.log(`Sending ${room.history.length} history commands to professor`);
                socket.emit('room-history', { commands: room.history });
            }

            // Notify students in the room
            socket.to(roomKey).emit('professor-joined', {
                professorName: professorName,
                timestamp: Date.now()
            });

            // Send updated user list to all users in room
            const studentList = Array.from(room.students).map(studentId => {
                const studentSession = userSessions.get(studentId);
                return {
                    name: studentSession ? studentSession.name : 'Unknown Student',
                    id: studentId.substring(0, 8)
                };
            });

            io.to(roomKey).emit('user-list-update', {
                total: room.userCount,
                professor: professorName,
                students: studentList
            });

            console.log(`Professor ${professorName} successfully joined room ${roomKey} (${room.userCount} users total)`);

        } catch (error) {
            console.error('Error in professor join:', error);
            logActivity('JOIN_PROFESSOR_EXCEPTION', socket.id, {
                error: error.message,
                stack: error.stack,
                data: data
            });
            
            // Send detailed error response
            socket.emit('room-error', {
                message: 'Failed to join room as professor',
                code: 'INTERNAL_ERROR',
                error: error.message,
                attemptNumber: data.attemptNumber || 0,
                timestamp: Date.now()
            });
        }
    });

    // Enhanced join-room-as-student with mobile support
    socket.on('join-room-as-student', (data) => {
        try {
            console.log(`JOIN-ROOM-AS-STUDENT attempt ${data.attemptNumber || 0} from socket ${socket.id.substring(0, 8)}`);
            console.log('Request data:', JSON.stringify(data, null, 2));

            const userAgent = socket.handshake.headers['user-agent'] || data.userAgent || '';
            const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent) || data.isMobile;
            console.log('Mobile client detected:', isMobile);

            logActivity('JOIN_STUDENT_ATTEMPT', socket.id, {
                ...data,
                isMobile,
                userAgent: userAgent.substring(0, 100)
            });

            // Send immediate acknowledgment
            socket.emit('join-attempt-received', {
                attemptNumber: data.attemptNumber || 0,
                timestamp: Date.now(),
                isMobile: isMobile
            });

            if (!data.studentName || !data.roomKey) {
                const error = { message: 'Student name and room key are required', code: 'MISSING_DATA' };
                console.error('STUDENT JOIN ERROR:', error.message);
                socket.emit('room-error', error);
                return;
            }

            const studentName = data.studentName.trim();
            const roomKey = data.roomKey.trim().toUpperCase();

            // Validate student name
            if (studentName.length < 1 || studentName.length > 50) {
                const error = { message: 'Student name must be 1-50 characters', code: 'INVALID_NAME' };
                console.error('STUDENT JOIN ERROR:', error.message);
                socket.emit('room-error', error);
                return;
            }

            // Check if room exists
            if (!rooms.has(roomKey)) {
                const error = { message: `Room ${roomKey} does not exist`, code: 'ROOM_NOT_FOUND' };
                console.error('STUDENT JOIN ERROR:', error.message);
                socket.emit('room-error', error);
                return;
            }

            const room = rooms.get(roomKey);

            // Check room capacity
            if (room.userCount >= 100) {
                const error = { message: 'Room is at maximum capacity', code: 'ROOM_FULL' };
                console.error('STUDENT JOIN ERROR:', error.message);
                socket.emit('room-error', error);
                return;
            }

            // Join the socket room
            socket.join(roomKey);

            // Add student to room
            room.students.add(socket.id);
            room.userCount = 1 + room.students.size; // 1 professor + students

            // Store user session
            userSessions.set(socket.id, {
                role: 'student',
                name: studentName.trim(),
                roomKey: roomKey,
                userId: socket.id,
                joinedAt: Date.now(),
                isMobile: isMobile,
                userAgent: userAgent.substring(0, 200)
            });

            console.log(`Student ${studentName} joined room ${roomKey} (${room.userCount} users total)`);
            logActivity('JOIN_STUDENT_SUCCESS', socket.id, { roomKey, studentName, userCount: room.userCount });

            // Send success response
            socket.emit('room-joined', {
                success: true,
                roomKey: roomKey,
                userCount: room.userCount,
                role: 'student',
                message: `Successfully joined room ${roomKey} as student`,
                timestamp: Date.now(),
                isMobile: isMobile,
                attemptNumber: data.attemptNumber || 0
            });

            // Send room history to student
            if (room.history.length > 0) {
                console.log(`Sending ${room.history.length} history commands to student`);
                socket.emit('room-history', { commands: room.history });
            }

            // Send updated user list to all users in room
            const studentList = Array.from(room.students).map(studentId => {
                const studentSession = userSessions.get(studentId);
                return {
                    name: studentSession ? studentSession.name : 'Unknown Student',
                    id: studentId.substring(0, 8)
                };
            });

            const professorSession = userSessions.get(room.professor);
            const professorName = professorSession ? professorSession.name : 'Unknown Professor';

            io.to(roomKey).emit('user-list-update', {
                total: room.userCount,
                professor: professorName,
                students: studentList
            });

        } catch (error) {
            console.error('Error in student join:', error);
            logActivity('JOIN_STUDENT_EXCEPTION', socket.id, { error: error.message, data: data });
            
            socket.emit('room-error', {
                message: 'Failed to join room as student',
                code: 'INTERNAL_ERROR',
                error: error.message,
                attemptNumber: data.attemptNumber || 0,
                timestamp: Date.now()
            });
        }
    });

    // Enhanced drawing command with comprehensive validation and mobile debugging
    socket.on('draw-command', (data) => {
        try {
            console.log(`DRAW-COMMAND received from socket ${socket.id.substring(0, 8)}`);
            
            const userSession = userSessions.get(socket.id);
            console.log('Session lookup result:', userSession ? 'FOUND' : 'NOT FOUND');
            
            if (userSession) {
                console.log('Session details:', {
                    role: userSession.role,
                    name: userSession.name,
                    roomKey: userSession.roomKey,
                    isMobile: userSession.isMobile
                });
            }
            
            if (!userSession) {
                console.error('PERMISSION DENIED: User session not found');
                console.log('Available sessions:', Array.from(userSessions.keys()).map(id => id.substring(0, 8)));
                logActivity('DRAW_PERMISSION_DENIED', socket.id, { reason: 'session_not_found' });
                
                socket.emit('permission-denied', {
                    message: 'User session not found',
                    code: 'SESSION_NOT_FOUND',
                    socketId: socket.id.substring(0, 8),
                    availableSessions: Array.from(userSessions.keys()).length,
                    timestamp: Date.now()
                });
                return;
            }

            // Only professors can draw
            if (userSession.role !== 'professor') {
                console.log(`PERMISSION DENIED: User role is ${userSession.role}, not professor`);
                logActivity('DRAW_PERMISSION_DENIED', socket.id, { 
                    reason: 'not_professor', 
                    actualRole: userSession.role 
                });
                
                socket.emit('permission-denied', {
                    message: 'Only professors can draw',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    userRole: userSession.role,
                    requiredRole: 'professor',
                    timestamp: Date.now()
                });
                return;
            }

            const roomKey = userSession.roomKey;
            if (!rooms.has(roomKey)) {
                console.error('DRAW ERROR: Room not found');
                logActivity('DRAW_ERROR', socket.id, { reason: 'room_not_found', roomKey });
                socket.emit('permission-denied', {
                    message: 'Room not found',
                    code: 'ROOM_NOT_FOUND',
                    roomKey: roomKey,
                    timestamp: Date.now()
                });
                return;
            }

            const room = rooms.get(roomKey);

            // Validate draw command data
            if (!data.path || !Array.isArray(data.path) || data.path.length === 0) {
                console.error('DRAW ERROR: Invalid path data');
                logActivity('DRAW_ERROR', socket.id, { reason: 'invalid_path', data });
                return;
            }

            // Create draw command
            const drawCommand = {
                type: 'draw',
                path: data.path,
                color: data.color || '#2563eb',
                width: data.width || 2,
                timestamp: Date.now(),
                userId: socket.id,
                professorName: userSession.name
            };

            console.log(`Processing draw command: ${data.path.length} points, color: ${drawCommand.color}, width: ${drawCommand.width}`);
            
            // Add to room history
            room.history.push(drawCommand);
            
            // Limit history to prevent memory issues
            if (room.history.length > 1000) {
                room.history = room.history.slice(-500);
            }

            // Broadcast to all users in the room except sender
            socket.to(roomKey).emit('draw-command', drawCommand);
            
            logActivity('DRAW_SUCCESS', socket.id, {
                roomKey,
                pathPoints: data.path.length,
                color: drawCommand.color,
                width: drawCommand.width
            });

            console.log(`Draw command broadcasted to room ${roomKey} (${room.userCount - 1} recipients)`);

        } catch (error) {
            console.error('Error processing draw command:', error);
            logActivity('DRAW_EXCEPTION', socket.id, { error: error.message, data });
            
            socket.emit('permission-denied', {
                message: 'Failed to process draw command',
                code: 'PROCESSING_ERROR',
                error: error.message,
                timestamp: Date.now()
            });
        }
    });

    // Enhanced canvas clear with permission validation
    socket.on('clear-canvas', (data) => {
        try {
            console.log(`CLEAR-CANVAS command from socket ${socket.id.substring(0, 8)}`);
            
            const userSession = userSessions.get(socket.id);
            if (!userSession) {
                console.error('CLEAR DENIED: User session not found');
                socket.emit('permission-denied', {
                    message: 'User session not found',
                    code: 'SESSION_NOT_FOUND',
                    timestamp: Date.now()
                });
                return;
            }

            // Only professors can clear canvas
            if (userSession.role !== 'professor') {
                console.log(`CLEAR DENIED: User role is ${userSession.role}, not professor`);
                socket.emit('permission-denied', {
                    message: 'Only professors can clear the canvas',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    userRole: userSession.role,
                    timestamp: Date.now()
                });
                return;
            }

            const roomKey = userSession.roomKey;
            if (!rooms.has(roomKey)) {
                console.error('CLEAR ERROR: Room not found');
                return;
            }

            const room = rooms.get(roomKey);

            // Clear room history
            room.history = [];

            // Broadcast clear command to all users in the room
            io.to(roomKey).emit('canvas-cleared', {
                timestamp: Date.now(),
                clearedBy: userSession.name
            });

            console.log(`Canvas cleared by professor ${userSession.name} in room ${roomKey}`);
            logActivity('CANVAS_CLEARED', socket.id, { roomKey, professorName: userSession.name });

        } catch (error) {
            console.error('Error processing clear canvas:', error);
            logActivity('CLEAR_EXCEPTION', socket.id, { error: error.message });
        }
    });

    // Enhanced disconnect handling
    socket.on('disconnect', (reason) => {
        console.log(`Client disconnected: ${socket.id.substring(0, 8)} - Reason: ${reason}`);
        logActivity('CLIENT_DISCONNECTED', socket.id, { reason });

        const userSession = userSessions.get(socket.id);
        if (userSession) {
            const { roomKey, role, name } = userSession;
            console.log(`Removing ${role} ${name} from room ${roomKey}`);

            if (rooms.has(roomKey)) {
                const room = rooms.get(roomKey);

                if (role === 'professor') {
                    // Professor disconnected - notify students
                    socket.to(roomKey).emit('professor-disconnected', {
                        professorName: name,
                        timestamp: Date.now()
                    });
                    
                    // Remove professor from room
                    room.professor = null;
                    room.userCount = room.students.size;
                    
                    // If no students, clean up room
                    if (room.students.size === 0) {
                        rooms.delete(roomKey);
                        console.log(`Room ${roomKey} deleted - no users remaining`);
                    }
                } else if (role === 'student') {
                    // Student disconnected
                    room.students.delete(socket.id);
                    room.userCount = (room.professor ? 1 : 0) + room.students.size;
                    
                    // If no professor and no students, clean up room
                    if (!room.professor && room.students.size === 0) {
                        rooms.delete(roomKey);
                        console.log(`Room ${roomKey} deleted - no users remaining`);
                    }
                }

                // Send updated user list to remaining users
                if (rooms.has(roomKey)) {
                    const updatedRoom = rooms.get(roomKey);
                    const studentList = Array.from(updatedRoom.students).map(studentId => {
                        const studentSession = userSessions.get(studentId);
                        return {
                            name: studentSession ? studentSession.name : 'Unknown Student',
                            id: studentId.substring(0, 8)
                        };
                    });

                    const professorSession = updatedRoom.professor ? userSessions.get(updatedRoom.professor) : null;
                    const professorName = professorSession ? professorSession.name : null;

                    io.to(roomKey).emit('user-list-update', {
                        total: updatedRoom.userCount,
                        professor: professorName,
                        students: studentList
                    });
                }
            }

            // Remove user session
            userSessions.delete(socket.id);
            logActivity('SESSION_REMOVED', socket.id, { role, name, roomKey });
        }

        // Keep debug log for a while for troubleshooting
        setTimeout(() => {
            debugSessionLog.delete(socket.id);
        }, 300000); // Keep for 5 minutes after disconnect
    });

    // Connection error handling
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id.substring(0, 8)}:`, error);
        logActivity('SOCKET_ERROR', socket.id, { error: error.message });
    });

    // Transport upgrade logging for mobile debugging
    socket.conn.on('upgrade', () => {
        console.log(`Transport upgraded to ${socket.conn.transport.name} for ${socket.id.substring(0, 8)}`);
        logActivity('TRANSPORT_UPGRADE', socket.id, { newTransport: socket.conn.transport.name });
    });

    socket.conn.on('upgradeError', (error) => {
        console.log(`Transport upgrade error for ${socket.id.substring(0, 8)}:`, error.message);
        logActivity('TRANSPORT_UPGRADE_ERROR', socket.id, { error: error.message });
    });
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Cleanup old debug logs periodically
setInterval(() => {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [socketId, log] of debugSessionLog.entries()) {
        const logTime = new Date(log.connectTime).getTime();
        if (logTime < cutoff) {
            debugSessionLog.delete(socketId);
        }
    }
    
    console.log(`Debug log cleanup: ${debugSessionLog.size} sessions remaining`);
}, 60 * 60 * 1000); // Run every hour

// Status logging
setInterval(() => {
    console.log(`📊 Server Status: ${rooms.size} rooms, ${userSessions.size} active users, ${io.engine.clientsCount} connections`);
    
    // Log room details
    for (const [roomKey, room] of rooms.entries()) {
        const professorSession = room.professor ? userSessions.get(room.professor) : null;
        const professorName = professorSession ? professorSession.name : 'No Professor';
        console.log(`  Room ${roomKey}: ${professorName} + ${room.students.size} students (${room.history.length} draw commands)`);
    }
}, 5 * 60 * 1000); // Every 5 minutes

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Vector Whiteboard Server running on port ${PORT}`);
    console.log(`🎨 Features: Professor-Student rooms, Real-time drawing, Mobile optimized`);
    console.log(`🔧 Debug endpoints available: /debug/sessions, /debug/logs, /api/health`);
    console.log(`📱 Enhanced mobile support with retry mechanisms and detailed logging`);
});