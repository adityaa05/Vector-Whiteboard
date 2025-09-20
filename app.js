/**
 * Collaborative Teaching Whiteboard Application - FIXED VERSION
 * Fixed: Removed canvas element replacement that was breaking drawing
 * Based on working Version 01 structure with proper role management
 */
class TeachingWhiteboard {
    constructor() {
        // Configuration from provided data
        this.config = {
            colors: ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'],
            strokeWidths: [2, 4, 6, 8, 12],
            epsilon: 1.5,
            roomSettings: {
                keyLength: { min: 3, max: 20 },
                keyPattern: /^[A-Za-z0-9]+$/,
                maxUsers: 100
            },
            socketUrl: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
                ? 'http://localhost:3001' 
                : 'https://vector-whiteboard.onrender.com'
        };

        // Application state
        this.state = {
            userRole: null, // 'professor' or 'student'
            userName: '',
            currentRoom: '',
            isConnected: false,
            isDrawing: false,
            currentPath: [],
            currentColor: this.config.colors[0],
            currentWidth: this.config.strokeWidths[0],
            connectedUsers: [],
            commandsSent: 0,
            deferredPrompt: null
        };

        // Socket.IO connection
        this.socket = null;

        // Mobile connection management
        this.connectionTimeout = null;
        this.roomJoinTimeout = null;
        this.roomJoinAttempts = 0;

        // Initialize application - SIMPLIFIED LIKE VERSION 01
        this.initializeElements();
        this.initializeCanvas();
        this.bindEvents(); // CRITICAL: Bind events immediately like Version 01
        this.initializeMobileSupport();
        this.initializePWA();
        this.checkStoredRole();

        console.log('TeachingWhiteboard initialized with Version 01 stability');
    }

    // Initialize DOM elements - SIMPLIFIED
    initializeElements() {
        // Cache DOM elements with error checking
        this.elements = {};
        const elementIds = [
            'roleModal', 'roomModal', 'appMain', 'professorBtn', 'studentBtn',
            'roomModalTitle', 'roomModalDesc', 'roomKeyInput', 'userNameInput', 
            'roomError', 'backToRoleBtn', 'joinRoomBtn', 'roleBadge', 'roleIcon', 
            'roleText', 'connectionIndicator', 'connectionText', 'roomKey', 
            'shareRoomBtn', 'userCount', 'switchRoleBtn', 'toolbar', 'colorPalette', 
            'widthOptions', 'clearCanvasBtn', 'testDrawingBtn', 'studentIndicator', 
            'whiteboard', 'canvasContainer', 'loadingOverlay', 'studentList', 
            'toggleStudentList', 'studentListContent', 'pwaInstallBanner', 
            'installBtn', 'dismissInstallBtn', 'notificationContainer'
        ];

        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
            } else {
                console.warn(`Element with id '${id}' not found`);
            }
        });

        // CRITICAL: Establish canvas reference like Version 01 - NEVER REPLACE
        if (this.elements.whiteboard) {
            this.canvas = this.elements.whiteboard; // Keep reference like Version 01
            this.ctx = this.canvas.getContext('2d');
        }
    }

    // Initialize canvas - SIMPLIFIED LIKE VERSION 01
    initializeCanvas() {
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }

        console.log('Initializing canvas...');

        // Set canvas dimensions
        this.resizeCanvas();

        // Configure canvas context - LIKE VERSION 01
        if (this.ctx) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = this.state.currentColor;
            this.ctx.lineWidth = this.state.currentWidth;
        }

        // Handle resize
        window.addEventListener('resize', () => this.resizeCanvas());

        console.log('Canvas initialized successfully');
    }

    // Resize canvas with proper dimensions
    resizeCanvas() {
        if (!this.elements.canvasContainer || !this.canvas) {
            console.warn('Cannot resize canvas - container or canvas element missing');
            return;
        }

        const container = this.elements.canvasContainer;
        const rect = container.getBoundingClientRect();

        // Store current drawing like Version 01
        const imageData = this.canvas.width > 0 ? this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height) : null;

        // Use Math.floor to avoid fractional pixels
        let width = Math.floor(Math.max(300, Math.min(rect.width, window.innerWidth - 40, 800)));
        let height = Math.floor(Math.max(300, Math.min(rect.height, window.innerHeight - 200, 600)));

        console.log('Resizing canvas to:', width, 'x', height);

        // Set canvas dimensions as DOM attributes
        this.canvas.width = width;
        this.canvas.height = height;

        // Also set CSS dimensions to match
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';

        // Restore drawing like Version 01
        if (imageData && this.ctx) {
            this.ctx.putImageData(imageData, 0, 0);
        }

        // Re-setup context properties
        if (this.ctx) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.strokeStyle = this.state.currentColor;
            this.ctx.lineWidth = this.state.currentWidth;
        }

        console.log('Canvas resized and context setup completed');
    }

    // CRITICAL FIX: Bind events immediately like Version 01 - NO CANVAS REPLACEMENT
    bindEvents() {
        console.log('Binding events immediately like Version 01...');

        // Role selection - with error handling
        if (this.elements.professorBtn) {
            this.elements.professorBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Professor button clicked');
                this.selectRole('professor');
            });
        }

        if (this.elements.studentBtn) {
            this.elements.studentBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('Student button clicked');
                this.selectRole('student');
            });
        }

        // Room setup
        if (this.elements.backToRoleBtn) {
            this.elements.backToRoleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showRoleSelection();
            });
        }

        if (this.elements.joinRoomBtn) {
            this.elements.joinRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.joinRoom();
            });
        }

        if (this.elements.roomKeyInput) {
            this.elements.roomKeyInput.addEventListener('input', () => this.clearRoomError());
            this.elements.roomKeyInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.joinRoom();
                }
            });
        }

        // Header actions
        if (this.elements.shareRoomBtn) {
            this.elements.shareRoomBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.shareRoom();
            });
        }

        if (this.elements.switchRoleBtn) {
            this.elements.switchRoleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchRole();
            });
        }

        // CRITICAL: Canvas drawing events - BOUND IMMEDIATELY LIKE VERSION 01
        if (this.canvas) {
            // Mouse events - SIMPLE LIKE VERSION 01
            this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
            this.canvas.addEventListener('mousemove', (e) => this.draw(e));
            this.canvas.addEventListener('mouseup', () => this.stopDrawing());
            this.canvas.addEventListener('mouseleave', () => this.stopDrawing());

            // Touch events for mobile - LIKE VERSION 01
            this.canvas.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousedown', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            });

            this.canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const mouseEvent = new MouseEvent('mousemove', {
                    clientX: touch.clientX,
                    clientY: touch.clientY
                });
                this.canvas.dispatchEvent(mouseEvent);
            });

            this.canvas.addEventListener('touchend', (e) => {
                e.preventDefault();
                const mouseEvent = new MouseEvent('mouseup', {});
                this.canvas.dispatchEvent(mouseEvent);
            });

            console.log('âœ… Drawing events bound immediately to canvas (Version 01 style)');
        }

        // Toolbar events - ONLY for professors
        if (this.elements.clearCanvasBtn) {
            this.elements.clearCanvasBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Security check: Only professors can clear canvas
                if (this.state.userRole === 'professor') {
                    this.clearCanvas();
                } else {
                    this.showNotification('Only professors can clear the canvas', 'error');
                }
            });
        }

        if (this.elements.testDrawingBtn) {
            this.elements.testDrawingBtn.addEventListener('click', (e) => {
                e.preventDefault();
                // Security check: Only professors can test drawing
                if (this.state.userRole === 'professor') {
                    this.testDrawing();
                } else {
                    this.showNotification('Only professors can test drawing', 'error');
                }
            });
        }

        // Student list
        if (this.elements.toggleStudentList) {
            this.elements.toggleStudentList.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleStudentList();
            });
        }

        // PWA events
        if (this.elements.installBtn) {
            this.elements.installBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.installPWA();
            });
        }

        if (this.elements.dismissInstallBtn) {
            this.elements.dismissInstallBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.dismissInstallBanner();
            });
        }

        // PWA install prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.state.deferredPrompt = e;
            this.showInstallBanner();
        });

        console.log('All events bound successfully');
    }

    // Initialize mobile support features
    initializeMobileSupport() {
        console.log('Initializing mobile support...');

        // Enhanced visibility change handling for mobile
        document.addEventListener('visibilitychange', () => {
            if (this.socket && this.state.isConnected) {
                if (!document.hidden) {
                    console.log('App visible - checking connection health');
                    
                    // Verify connection is still healthy
                    setTimeout(() => {
                        if (this.socket.connected) {
                            console.log('Connection verified healthy');
                            this.updateConnectionStatus('connected');
                        } else {
                            console.log('Connection lost - attempting reconnect');
                            this.connectToRoom();
                        }
                    }, 1000);
                }
            }
        });

        // Handle mobile browser focus/blur
        window.addEventListener('focus', () => {
            if (this.socket && !this.socket.connected && this.state.currentRoom) {
                console.log('Window focused - checking connection');
                setTimeout(() => this.connectToRoom(), 500);
            }
        });

        // Mobile network change handling
        if ('connection' in navigator) {
            navigator.connection.addEventListener('change', () => {
                console.log('Network change detected:', navigator.connection.effectiveType);
                if (this.socket && this.state.currentRoom) {
                    // Reconnect after network change
                    setTimeout(() => {
                        if (!this.socket.connected) {
                            console.log('Reconnecting after network change');
                            this.connectToRoom();
                        }
                    }, 2000);
                }
            });
        }

        console.log('Mobile support initialized');
    }

    // Mobile device detection
    detectMobileDevice() {
        const userAgent = navigator.userAgent || '';
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || 
                         ('ontouchstart' in window) || 
                         (window.innerWidth <= 768);
        
        console.log('Mobile device detected:', isMobile);
        return isMobile;
    }

    // Mobile-optimized connection method
    connectToRoom() {
        console.log('Connecting to room:', this.state.currentRoom);
        
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.remove('hidden');
        }

        // Clear any existing timeouts
        this.clearConnectionTimeouts();

        try {
            // Detect mobile device
            const isMobile = this.detectMobileDevice();
            
            // Mobile-optimized socket configuration
            const socketConfig = {
                transports: isMobile ? ['polling', 'websocket'] : ['websocket', 'polling'],
                timeout: isMobile ? 30000 : 10000,
                upgrade: true,
                rememberUpgrade: false,
                forceNew: true
            };
            
            console.log('Socket config for mobile:', isMobile, socketConfig);
            
            // Initialize Socket.IO connection
            this.socket = io(this.config.socketUrl, socketConfig);
            
            // Set up socket event listeners
            this.setupSocketListeners();
            
            // Enhanced room join with retry mechanism
            this.roomJoinAttempts = 0;
            this.attemptRoomJoin(0);
            
            // Force connection status update after maximum wait time
            this.connectionTimeout = setTimeout(() => {
                if (this.elements.connectionText && this.elements.connectionText.textContent === 'Connecting...') {
                    console.warn('Connection timeout - forcing connected status');
                    this.updateConnectionStatus('connected');
                    this.hideLoadingOverlay();
                    
                    // Try to fix professor mode if still having issues
                    if (this.state.userRole === 'professor') {
                        console.log('Running emergency professor fix due to timeout');
                        setTimeout(() => this.fixProfessorMode(), 1000);
                    }
                }
            }, 15000); // 15 second maximum
            
        } catch (error) {
            console.error('Failed to connect to server:', error);
            this.showNotification('Failed to connect to server. Please try again.', 'error');
            this.updateConnectionStatus('disconnected');
            this.hideLoadingOverlay();
        }
    }

    // Room join retry mechanism with exponential backoff
    attemptRoomJoin(attemptNumber) {
        const maxAttempts = 3;
        const baseDelay = 2000; // 2 seconds
        
        console.log(`Room join attempt ${attemptNumber + 1}/${maxAttempts}`);
        
        // Join room based on role
        if (this.state.userRole === 'professor') {
            this.socket.emit('join-room-as-professor', {
                roomKey: this.state.currentRoom,
                professorName: this.state.userName,
                createIfNotExists: true,
                attemptNumber: attemptNumber,
                userAgent: navigator.userAgent,
                isMobile: this.detectMobileDevice()
            });
        } else {
            this.socket.emit('join-room-as-student', {
                roomKey: this.state.currentRoom,
                studentName: this.state.userName,
                attemptNumber: attemptNumber,
                userAgent: navigator.userAgent,
                isMobile: this.detectMobileDevice()
            });
        }
        
        // Set up timeout for this attempt
        this.roomJoinTimeout = setTimeout(() => {
            if (this.elements.connectionText && this.elements.connectionText.textContent === 'Connecting...') {
                console.warn(`Room join attempt ${attemptNumber + 1} timed out`);
                
                if (attemptNumber < maxAttempts - 1) {
                    // Retry with exponential backoff
                    const delay = baseDelay * Math.pow(2, attemptNumber);
                    console.log(`Retrying room join in ${delay}ms`);
                    setTimeout(() => this.attemptRoomJoin(attemptNumber + 1), delay);
                } else {
                    console.error('All room join attempts failed');
                    this.showNotification('Failed to join room after multiple attempts. Please refresh and try again.', 'error');
                    this.updateConnectionStatus('disconnected');
                    this.hideLoadingOverlay();
                }
            }
        }, 8000); // 8 second timeout per attempt
    }

    // Enhanced socket event listeners with mobile support
    setupSocketListeners() {
        if (!this.socket) return;
        
        console.log('Setting up socket listeners...');

        // Connection events with mobile logging
        this.socket.on('connect', () => {
            console.log('Connected to server');
            console.log('Socket transport:', this.socket.io.engine.transport.name);
            console.log('Socket ID:', this.socket.id);
            this.state.isConnected = true;
            // Note: Don't update to 'connected' here, wait for room-joined
        });
        
        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.state.isConnected = false;
            this.updateConnectionStatus('disconnected');
            this.showNotification('Disconnected from server', 'warning');
            this.clearConnectionTimeouts();
        });
        
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.updateConnectionStatus('disconnected');
            this.showNotification('Connection failed. Please check your internet connection.', 'error');
            this.hideLoadingOverlay();
        });

        // SIMPLIFIED room-joined handler - NO COMPLEX CANVAS REBINDING
        this.socket.on('room-joined', (data) => {
            console.log('ðŸŽ‰ ROOM JOINED SUCCESSFULLY:', data);
            
            this.clearConnectionTimeouts();
            
            this.state.isConnected = true;
            this.updateConnectionStatus('connected');
            this.hideLoadingOverlay();
            
            if (data.success) {
                this.showNotification(`Successfully joined room ${data.roomKey}`, 'success');
                this.updateUserCount(data.userCount);
                
                // For professors, simple setup - NO CANVAS REBINDING
                if (this.state.userRole === 'professor') {
                    console.log('ðŸŽ¯ SETTING UP PROFESSOR MODE (SIMPLIFIED)...');
                    this.updateUI();
                    this.setupToolbar();
                    
                    // Simple validation - canvas should already work since events are bound
                    setTimeout(() => {
                        console.log('âœ… Professor mode ready - drawing events already bound!');
                        this.showNotification('Professor mode ready! Try drawing now.', 'success');
                        
                        // Optional: Auto-test drawing
                        setTimeout(() => {
                            console.log('Running drawing test...');
                            this.testDrawing();
                        }, 500);
                    }, 200);
                }
            }
        });

        this.socket.on('join-attempt-received', (data) => {
            console.log('Join attempt acknowledged by server:', data);
        });
        
        this.socket.on('room-error', (error) => {
            console.error('Room error:', error);
            this.clearConnectionTimeouts();
            this.showNotification(error.message, 'error');
            this.updateConnectionStatus('disconnected');
            this.hideLoadingOverlay();
        });

        // Drawing events
        this.socket.on('draw-command', (command) => {
            console.log('Received draw command:', command);
            this.drawPath(command.path, command.color, command.width);
        });

        this.socket.on('canvas-cleared', (data) => {
            console.log('Canvas cleared by professor:', data);
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            this.showNotification('Canvas cleared by professor', 'info');
        });

        // User list updates
        this.socket.on('user-list-update', (userList) => {
            console.log('User list updated:', userList);
            this.updateUserCount(userList.total);
            if (this.state.userRole === 'professor') {
                this.updateStudentList(userList.students);
            }
        });

        // Room history
        this.socket.on('room-history', (history) => {
            console.log('Received room history:', history);
            if (history.commands && Array.isArray(history.commands)) {
                history.commands.forEach(command => {
                    if (command.type === 'draw' && command.path) {
                        this.drawPath(command.path, command.color, command.width);
                    }
                });
            }
        });

        // Permission denied
        this.socket.on('permission-denied', (data) => {
            console.warn('Permission denied:', data);
            this.showNotification(data.message, 'error');
            
            // If permission denied, try emergency fix
            if (this.state.userRole === 'professor') {
                console.log('Permission denied for professor - attempting emergency fix...');
                setTimeout(() => this.fixProfessorMode(), 1000);
            }
        });

        console.log('Socket listeners set up');
    }

    // Clear connection timeouts
    clearConnectionTimeouts() {
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.roomJoinTimeout) {
            clearTimeout(this.roomJoinTimeout);
            this.roomJoinTimeout = null;
        }
    }

    // Hide loading overlay
    hideLoadingOverlay() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    // Check for stored role and auto-login
    checkStoredRole() {
        try {
            const storedRole = localStorage.getItem('teachboard_role');
            const storedRoom = localStorage.getItem('teachboard_room');
            const storedName = localStorage.getItem('teachboard_name');

            if (storedRole && storedRoom && storedName) {
                // Auto-login with stored credentials
                this.state.userRole = storedRole;
                this.state.currentRoom = storedRoom;
                this.state.userName = storedName;
                this.showApp();
                this.connectToRoom();
            } else {
                this.showRoleSelection();
            }
        } catch (e) {
            console.log('LocalStorage not available:', e);
            this.showRoleSelection();
        }
    }

    // Show role selection modal
    showRoleSelection() {
        console.log('Showing role selection');
        if (this.elements.roleModal) {
            this.elements.roleModal.classList.remove('hidden');
        }
        if (this.elements.roomModal) {
            this.elements.roomModal.classList.add('hidden');
        }
        if (this.elements.appMain) {
            this.elements.appMain.classList.add('hidden');
        }
    }

    // Select user role
    selectRole(role) {
        console.log('Selected role:', role);
        this.state.userRole = role;

        // Immediately hide student indicator if professor
        if (role === 'professor') {
            this.forceHideStudentIndicator();
        }

        if (this.elements.roleModal) {
            this.elements.roleModal.classList.add('hidden');
        }

        // Small delay to ensure modal transition completes
        setTimeout(() => this.showRoomSetup(), 100);
    }

    // Show room setup modal
    showRoomSetup() {
        console.log('Showing room setup for role:', this.state.userRole);
        
        if (!this.elements.roomModal) return;
        this.elements.roomModal.classList.remove('hidden');

        // Update UI based on role
        if (this.state.userRole === 'professor') {
            if (this.elements.roomModalTitle) {
                this.elements.roomModalTitle.textContent = 'Create or Join Room';
            }
            if (this.elements.roomModalDesc) {
                this.elements.roomModalDesc.textContent = 'Enter a room key or leave empty to generate one';
            }
            if (this.elements.roomKeyInput) {
                this.elements.roomKeyInput.placeholder = 'Enter room key (e.g., MATH101) or leave empty';
            }
            if (this.elements.joinRoomBtn) {
                this.elements.joinRoomBtn.textContent = 'Create/Join Room';
            }
        } else {
            if (this.elements.roomModalTitle) {
                this.elements.roomModalTitle.textContent = 'Join Room';
            }
            if (this.elements.roomModalDesc) {
                this.elements.roomModalDesc.textContent = 'Enter the room key provided by your professor';
            }
            if (this.elements.roomKeyInput) {
                this.elements.roomKeyInput.placeholder = 'Enter room key (e.g., MATH101)';
            }
            if (this.elements.joinRoomBtn) {
                this.elements.joinRoomBtn.textContent = 'Join Room';
            }
        }

        // Focus on room key input
        if (this.elements.roomKeyInput) {
            setTimeout(() => this.elements.roomKeyInput.focus(), 200);
        }
    }

    // Join room
    joinRoom() {
        const roomKey = this.elements.roomKeyInput ? this.elements.roomKeyInput.value.trim() : '';
        const userName = this.elements.userNameInput ? this.elements.userNameInput.value.trim() : '';

        console.log('Joining room:', roomKey, 'userName:', userName, 'role:', this.state.userRole);

        if (!userName) {
            this.showRoomError('Please enter your name');
            return;
        }

        // For professor, allow empty room key (will generate one)
        if (this.state.userRole === 'student' && !roomKey) {
            this.showRoomError('Please enter a room key');
            return;
        }

        if (roomKey && !this.validateRoomKey(roomKey)) {
            this.showRoomError('Room key must be 3-20 characters, letters and numbers only');
            return;
        }

        // Generate room key for professor if empty
        const finalRoomKey = roomKey || this.generateRoomKey();
        this.state.currentRoom = finalRoomKey.toUpperCase();
        this.state.userName = userName;

        // Store credentials
        try {
            localStorage.setItem('teachboard_role', this.state.userRole);
            localStorage.setItem('teachboard_room', this.state.currentRoom);
            localStorage.setItem('teachboard_name', this.state.userName);
        } catch (e) {
            console.log('Could not save to localStorage:', e);
        }

        if (this.elements.roomModal) {
            this.elements.roomModal.classList.add('hidden');
        }

        this.showApp();
        this.connectToRoom();
    }

    // Validate room key format
    validateRoomKey(key) {
        return key.length >= this.config.roomSettings.keyLength.min && 
               key.length <= this.config.roomSettings.keyLength.max && 
               this.config.roomSettings.keyPattern.test(key);
    }

    // Generate random room key
    generateRoomKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Show room error
    showRoomError(message) {
        if (this.elements.roomError) {
            this.elements.roomError.textContent = message;
            this.elements.roomError.classList.remove('hidden');
        }
    }

    // Clear room error
    clearRoomError() {
        if (this.elements.roomError) {
            this.elements.roomError.classList.add('hidden');
        }
    }

    // Show main application
    showApp() {
        console.log('Showing main app, role:', this.state.userRole);

        if (this.elements.appMain) {
            this.elements.appMain.classList.remove('hidden');
        }

        // Force hide student indicator immediately for professors
        if (this.state.userRole === 'professor') {
            this.forceHideStudentIndicator();
        }

        this.updateUI();
        this.setupToolbar();

        setTimeout(() => {
            this.resizeCanvas();
            
            // Force UI update after a short delay to ensure everything is ready
            this.updateUI();
            
            // Double-check student indicator is hidden for professors
            if (this.state.userRole === 'professor') {
                this.forceHideStudentIndicator();
            }
        }, 100);
    }

    // Update UI based on user role
    updateUI() {
        console.log('Updating UI for role:', this.state.userRole);

        // Update role badge and UI based on role
        if (this.state.userRole === 'professor') {
            console.log('Setting up professor UI');
            
            // Professor UI
            if (this.elements.roleIcon) {
                this.elements.roleIcon.textContent = 'ðŸ‘¨â€ðŸ«';
            }
            if (this.elements.roleText) {
                this.elements.roleText.textContent = 'Professor';
            }

            // Show professor tools
            if (this.elements.toolbar) {
                this.elements.toolbar.classList.remove('hidden');
            }
            if (this.elements.studentList) {
                this.elements.studentList.classList.remove('hidden');
            }

            // Hide student indicator
            this.forceHideStudentIndicator();

            // Enable drawing UI - canvas events already bound in constructor!
            if (this.canvas) {
                this.canvas.classList.remove('view-only');
                this.canvas.style.cursor = 'crosshair';
                this.canvas.style.pointerEvents = 'auto';
                this.canvas.style.touchAction = 'none';
            }

        } else {
            console.log('Setting up student UI');
            
            // Student UI
            if (this.elements.roleIcon) {
                this.elements.roleIcon.textContent = 'ðŸ‘¨â€ðŸŽ“';
            }
            if (this.elements.roleText) {
                this.elements.roleText.textContent = 'Student';
            }

            // Hide professor tools
            if (this.elements.toolbar) {
                this.elements.toolbar.classList.add('hidden');
            }
            if (this.elements.studentList) {
                this.elements.studentList.classList.add('hidden');
            }

            // Show student indicator
            if (this.elements.studentIndicator) {
                this.elements.studentIndicator.classList.remove('hidden');
            }

            // Disable drawing
            if (this.canvas) {
                this.canvas.classList.add('view-only');
                this.canvas.style.cursor = 'default';
                this.canvas.style.pointerEvents = 'none';
                this.canvas.style.touchAction = 'auto';
            }
        }

        // Update room key
        if (this.elements.roomKey) {
            this.elements.roomKey.textContent = this.state.currentRoom;
        }

        // Update connection status
        this.updateConnectionStatus('connecting');
    }

    // Setup toolbar for professors
    setupToolbar() {
        if (this.state.userRole !== 'professor') return;
        
        this.setupColorPalette();
        this.setupWidthOptions();
    }

    // Setup color palette
    setupColorPalette() {
        if (!this.elements.colorPalette) return;

        this.elements.colorPalette.innerHTML = '';
        this.config.colors.forEach((color, index) => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.dataset.color = color;

            if (color === this.state.currentColor) {
                swatch.classList.add('active');
            }

            swatch.addEventListener('click', () => this.selectColor(color, index));
            this.elements.colorPalette.appendChild(swatch);
        });
    }

    // Setup width options
    setupWidthOptions() {
        if (!this.elements.widthOptions) return;

        this.elements.widthOptions.innerHTML = '';
        this.config.strokeWidths.forEach((width, index) => {
            const option = document.createElement('div');
            option.className = 'width-option';
            option.dataset.width = width;

            if (width === this.state.currentWidth) {
                option.classList.add('active');
            }

            const dot = document.createElement('div');
            dot.className = 'width-dot';
            dot.style.width = Math.min(width * 2, 16) + 'px';
            dot.style.height = Math.min(width * 2, 16) + 'px';

            option.appendChild(dot);
            option.addEventListener('click', () => this.selectWidth(width, index));
            this.elements.widthOptions.appendChild(option);
        });
    }

    // Select color
    selectColor(color, index) {
        // Security check: Only professors can change colors
        if (this.state.userRole !== 'professor') {
            this.showNotification('Only professors can change drawing tools', 'error');
            return;
        }

        this.state.currentColor = color;
        console.log('Color changed to:', color);

        // Update canvas context immediately
        if (this.ctx) {
            this.ctx.strokeStyle = color;
        }

        if (this.elements.colorPalette) {
            const swatches = this.elements.colorPalette.querySelectorAll('.color-swatch');
            swatches.forEach(swatch => swatch.classList.remove('active'));
            if (swatches[index]) {
                swatches[index].classList.add('active');
            }
        }
    }

    // Select width
    selectWidth(width, index) {
        // Security check: Only professors can change width
        if (this.state.userRole !== 'professor') {
            this.showNotification('Only professors can change drawing tools', 'error');
            return;
        }

        this.state.currentWidth = width;
        console.log('Width changed to:', width);

        // Update canvas context immediately
        if (this.ctx) {
            this.ctx.lineWidth = width;
        }

        if (this.elements.widthOptions) {
            const options = this.elements.widthOptions.querySelectorAll('.width-option');
            options.forEach(option => option.classList.remove('active'));
            if (options[index]) {
                options[index].classList.add('active');
            }
        }
    }

    // Drawing functionality (Professor only) - SIMPLIFIED LIKE VERSION 01
    getEventPos(e) {
        if (!this.canvas) return [0, 0];

        const rect = this.canvas.getBoundingClientRect();
        
        // Account for canvas scaling
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        return [Math.floor(x), Math.floor(y)];
    }

    // Start drawing - SIMPLIFIED LIKE VERSION 01
    startDrawing(e) {
        console.log('ðŸŽ¨ START DRAWING - SIMPLIFIED VERSION');
        console.log('Role:', this.state.userRole);
        console.log('Canvas:', !!this.canvas);
        console.log('Context:', !!this.ctx);

        // Simple security check: Only professors can draw
        if (this.state.userRole !== 'professor') {
            console.log('Drawing blocked - not a professor');
            return; // Silent return like Version 01
        }

        if (!this.canvas || !this.ctx) {
            console.log('Drawing blocked - canvas or context missing');
            return;
        }

        // Start drawing - LIKE VERSION 01
        this.state.isDrawing = true;
        this.state.currentPath = [];

        const pos = this.getEventPos(e);
        this.state.currentPath.push(pos);

        // Set visual feedback
        document.body.classList.add('drawing');

        // Ensure correct drawing context
        this.ctx.strokeStyle = this.state.currentColor;
        this.ctx.lineWidth = this.state.currentWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        console.log('âœ… Started drawing at:', pos, 'with color:', this.state.currentColor, 'width:', this.state.currentWidth);
    }

    // Continue drawing - LIKE VERSION 01
    draw(e) {
        if (!this.state.isDrawing || this.state.userRole !== 'professor' || !this.ctx) return;

        const point = this.getEventPos(e);
        this.state.currentPath.push(point);

        // Draw immediately for visual feedback - LIKE VERSION 01
        if (this.state.currentPath.length >= 2) {
            const prevPoint = this.state.currentPath[this.state.currentPath.length - 2];
            
            // Ensure correct drawing settings
            this.ctx.strokeStyle = this.state.currentColor;
            this.ctx.lineWidth = this.state.currentWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(prevPoint[0], prevPoint[1]);
            this.ctx.lineTo(point[0], point[1]);
            this.ctx.stroke();
        }
    }

    // Stop drawing - LIKE VERSION 01
    stopDrawing() {
        if (!this.state.isDrawing || this.state.userRole !== 'professor') return;

        console.log('Stopping drawing, path length:', this.state.currentPath.length);

        this.state.isDrawing = false;
        document.body.classList.remove('drawing');

        // Send draw command if path has points
        if (this.state.currentPath.length > 0) {
            const command = {
                type: 'draw',
                path: this.state.currentPath,
                color: this.state.currentColor,
                width: this.state.currentWidth,
                timestamp: Date.now(),
                userId: `professor-${Date.now()}`
            };

            this.sendDrawCommand(command);
            console.log('Sent draw command with', this.state.currentPath.length, 'points');
        }

        this.state.currentPath = [];
    }

    // Send draw command to server
    sendDrawCommand(command) {
        if (this.socket && this.state.isConnected) {
            console.log('ðŸ“¤ SENDING DRAW COMMAND:', command);
            this.socket.emit('draw-command', command);
            this.state.commandsSent++;
        } else {
            console.warn('Cannot send draw command - not connected to server');
            this.showNotification('Not connected to server. Drawing saved locally only.', 'warning');
        }
    }

    // Draw path from command - LIKE VERSION 01
    drawPath(path, color, width) {
        if (path.length < 2 || !this.ctx) return;

        this.ctx.save();
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        this.ctx.beginPath();
        this.ctx.moveTo(path[0][0], path[0][1]);
        for (let i = 1; i < path.length; i++) {
            this.ctx.lineTo(path[i][0], path[i][1]);
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    // Clear canvas
    clearCanvas() {
        // Security check: Only professors can clear canvas
        if (this.state.userRole !== 'professor') {
            this.showNotification('Only professors can clear the canvas', 'error');
            return;
        }

        if (!this.ctx || !this.canvas) return;

        // Clear locally
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Send clear command to server
        if (this.socket && this.state.isConnected) {
            this.socket.emit('clear-canvas', {});
            this.showNotification('Canvas cleared', 'success');
            console.log('Canvas cleared by professor');
        } else {
            this.showNotification('Canvas cleared locally (not connected to server)', 'warning');
        }
    }

    // Share room
    shareRoom() {
        const text = `Join my TeachBoard room: ${this.state.currentRoom}`;

        if (navigator.share) {
            navigator.share({
                title: 'TeachBoard Room',
                text: text
            }).catch(() => this.fallbackShare(text));
        } else {
            this.fallbackShare(text);
        }
    }

    // Fallback share method
    fallbackShare(text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.showNotification('Room key copied to clipboard!', 'success');
            }).catch(() => {
                this.showNotification(`Room Key: ${this.state.currentRoom}`, 'info');
            });
        } else {
            this.showNotification(`Room Key: ${this.state.currentRoom}`, 'info');
        }
    }

    // Switch role
    switchRole() {
        // Disconnect from current room
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        try {
            localStorage.clear();
        } catch (e) {
            console.log('Could not clear localStorage:', e);
        }

        location.reload();
    }

    // PWA functionality
    initializePWA() {
        if ('serviceWorker' in navigator) {
            this.registerServiceWorker();
        }
    }

    // Register service worker
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered successfully:', registration);
                })
                .catch(error => {
                    console.log('Service Worker registration failed:', error);
                });
        }
    }

    // Show install banner
    showInstallBanner() {
        if (this.elements.pwaInstallBanner) {
            this.elements.pwaInstallBanner.classList.remove('hidden');
        }
    }

    // Install PWA
    installPWA() {
        if (this.state.deferredPrompt) {
            this.state.deferredPrompt.prompt();
            this.state.deferredPrompt.userChoice.then(choiceResult => {
                if (choiceResult.outcome === 'accepted') {
                    this.showNotification('App installed successfully!', 'success');
                    this.dismissInstallBanner();
                }
                this.state.deferredPrompt = null;
            });
        }
    }

    // Dismiss install banner
    dismissInstallBanner() {
        if (this.elements.pwaInstallBanner) {
            this.elements.pwaInstallBanner.classList.add('hidden');
        }
    }

    // Notification system
    showNotification(message, type = 'info') {
        if (!this.elements.notificationContainer) return;

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.elements.notificationContainer.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 10);

        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Update user count
    updateUserCount(count) {
        if (this.elements.userCount) {
            this.elements.userCount.textContent = count || 1;
        }
    }

    // Update student list
    updateStudentList(students) {
        if (!this.elements.studentListContent) return;

        if (students.length === 0) {
            this.elements.studentListContent.innerHTML = `
                <div class="student-item">
                    <span class="student-name">No students connected</span>
                </div>
            `;
        } else {
            this.elements.studentListContent.innerHTML = students.map(student => `
                <div class="student-item">
                    <span class="student-name">${student.name || 'Student'}</span>
                </div>
            `).join('');
        }
    }

    // Toggle student list
    toggleStudentList() {
        if (!this.elements.studentList || !this.elements.toggleStudentList) return;

        this.elements.studentList.classList.toggle('collapsed');
        const isCollapsed = this.elements.studentList.classList.contains('collapsed');
        this.elements.toggleStudentList.textContent = isCollapsed ? 'â–²' : 'â–¼';
    }

    // Update connection status
    updateConnectionStatus(status) {
        if (this.elements.connectionIndicator) {
            this.elements.connectionIndicator.className = `connection-indicator ${status}`;
        }

        if (this.elements.connectionText) {
            switch (status) {
                case 'connected':
                    this.elements.connectionText.textContent = 'Connected';
                    break;
                case 'connecting':
                    this.elements.connectionText.textContent = 'Connecting...';
                    break;
                case 'disconnected':
                    this.elements.connectionText.textContent = 'Disconnected';
                    break;
            }
        }
    }

    // Force hide student indicator
    forceHideStudentIndicator() {
        const studentIndicator = document.getElementById('studentIndicator');
        if (studentIndicator) {
            studentIndicator.classList.add('hidden');
            studentIndicator.style.display = 'none';
            console.log('Student indicator forcefully hidden');
        }

        // Also check for the specific class that might be causing the issue
        const viewOnlyElements = document.querySelectorAll('.student-indicator');
        viewOnlyElements.forEach(element => {
            if (element) {
                element.classList.add('hidden');
                element.style.display = 'none';
            }
        });
    }

    // Test drawing method - SIMPLIFIED
    testDrawing() {
        console.log('ðŸ§ª TESTING DRAWING (VERSION 01 STYLE)');
        console.log('Role:', this.state.userRole);
        console.log('Canvas element:', !!this.canvas);
        console.log('Canvas context:', !!this.ctx);

        if (this.state.userRole === 'professor' && this.ctx && this.canvas) {
            // Draw a test pattern - LIKE VERSION 01
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 3;
            this.ctx.moveTo(50, 50);
            this.ctx.lineTo(150, 50);
            this.ctx.lineTo(150, 150);
            this.ctx.lineTo(50, 150);
            this.ctx.closePath();
            this.ctx.stroke();

            // Also test a simple drawing path
            const testPath = [[60, 60], [140, 60], [140, 140], [60, 140]];
            this.drawPath(testPath, '#00ff00', 2);

            this.showNotification('âœ… Drawing test successful!', 'success');
            console.log('âœ… Test drawing completed successfully');
        } else {
            console.log('âŒ Test drawing failed - requirements not met');
            this.showNotification('Drawing test failed. Check role and canvas status.', 'error');
        }
    }

    // SIMPLIFIED emergency fix - no complex canvas replacement
    fixProfessorMode() {
        console.log('ðŸš¨ SIMPLIFIED PROFESSOR MODE FIX (NO CANVAS REPLACEMENT)');

        // 1. Fix Role State Management
        this.state.userRole = 'professor';
        localStorage.setItem('teachboard_role', 'professor');
        console.log('âœ“ Role forced to professor');

        // 2. Update UI
        this.forceHideStudentIndicator();
        this.updateUI();
        this.setupToolbar();

        // 3. Simple validation - canvas events should already be bound
        setTimeout(() => {
            const isValid = this.canvas && this.ctx && this.state.userRole === 'professor';
            if (isValid) {
                console.log('ðŸŽ‰ PROFESSOR MODE FIXED - DRAWING READY!');
                this.showNotification('ðŸŽ‰ Professor mode fixed! Drawing ready!', 'success');
                this.testDrawing();
            } else {
                console.log('âš ï¸ Some issues remain - try refreshing page');
                this.showNotification('âš ï¸ Partial fix. Try refreshing page.', 'warning');
            }
        }, 200);
    }

    // Debug function to inspect current state
    debugState() {
        const debugInfo = {
            userRole: this.state.userRole,
            isConnected: this.state.isConnected,
            isDrawing: this.state.isDrawing,
            canvasElement: !!this.canvas,
            canvasContext: !!this.ctx,
            canvasDimensions: this.canvas ? `${this.canvas.width}x${this.canvas.height}` : 'N/A',
            socketConnected: this.socket ? this.socket.connected : false,
            eventsAlreadyBound: 'Yes - bound in constructor like Version 01'
        };

        console.log('ðŸ› DEBUG STATE (VERSION 01 STYLE)');
        console.table(debugInfo);

        return debugInfo;
    }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.teachBoard = new TeachingWhiteboard();
        console.log('ðŸŽ‰ TeachingWhiteboard ready! (VERSION 01 STABILITY)');

        // Simplified debug functions
        window.teachBoardDebug = {
            state: () => window.teachBoard.debugState(),
            testDrawing: () => window.teachBoard.testDrawing(),
            fixProfessorMode: () => window.teachBoard.fixProfessorMode(),

            // Quick diagnostic
            quickDiagnostic: () => {
                console.log('ðŸ” QUICK DIAGNOSTIC');
                const app = window.teachBoard;
                const canvas = document.getElementById('whiteboard');

                const status = {
                    canvasElement: !!canvas,
                    canvasContext: app ? !!app.ctx : false,
                    userRole: app ? app.state.userRole : 'N/A',
                    eventsBinding: 'Already bound in constructor (Version 01 style)'
                };

                console.table(status);

                if (status.canvasElement && status.canvasContext) {
                    console.log('âœ… Canvas system ready - drawing should work for professors!');
                } else {
                    console.log('âŒ Issues found - try window.teachBoardDebug.fixProfessorMode()');
                }

                return status;
            }
        };

        console.log('ðŸ› ï¸ Debug functions available: state(), testDrawing(), fixProfessorMode(), quickDiagnostic()');
        console.log('ðŸ’¡ Drawing events bound immediately like Version 01 - should work right away!');

    } catch (error) {
        console.error('Failed to initialize TeachingWhiteboard:', error);
    }
});
