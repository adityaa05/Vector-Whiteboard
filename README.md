# Vector-Whiteboard

**Collaborative Teaching Whiteboard**

A full-featured, real-time collaborative whiteboard for professors and students. Designed for virtual classrooms, e-learning, and interactive teaching/brainstorming sessions.

***

## Project Overview

**Vector-Whiteboard** facilitates seamless, real-time interaction between professors and students using a digital canvas. Users can draw, annotate, manipulate shapes, and collaborate instantaneously via Socket.io, supporting team-based sketching, concept illustration, and problem-solving—all in the browser. Its Progressive Web App (PWA) nature means it works offline and can be installed on mobile for enhanced accessibility.

***

## Features

- **Drawing Tools**: Pencil, Line, Rectangle, Circle, and Text
- **Shape Manipulation**: Move, Resize, Delete
- **Color & Stroke Customization**: Interactive color picker, multiple stroke widths
- **Export / Import**: PNG, SVG, JSON for saving and reloading sessions
- **Real-Time Collaboration**: Live multi-user sync using Socket.io rooms
- **Role-Based UI**: Professor and Student modes, with permissions and view-only capability for students
- **User Management**: Room creation/join, user count display, student list
- **Undo / Redo**: Canvas history traversal
- **Grid System**: Enhanced precision drawing
- **Notifications & Status**: In-app alerts and connection indicators
- **Progressive Web App**: Offline cache, install banner, service worker, manifest
- **Responsive & Modern UI**: Mobile-optimized layouts, accessible dark mode styling

***

## Tech Stack

- **Frontend**: HTML, CSS (CSS Grid/Flexbox, responsive, dark mode), JavaScript (Vanilla, ES6 Classes)
- **Backend**: Node.js, Express.js, Socket.io
- **PWA**: Manifest, Service Worker
- **Other**: Local Storage, Clipboard API, REST Endpoints for debugging

***

## Installation

```bash
# Clone the repository
git clone https://github.com/adityaa05/Vector-Whiteboard.git
cd Vector-Whiteboard

# Install server dependencies
npm install

# Start the backend server
node server.js

# Open index.html in your browser OR deploy the project using Netlify/Render for public hosting
```

*Note:* The project can be installed as a PWA by opening the app in Chrome/Edge and clicking "Install" for offline access.

***

## Screenshots

![Main Whiteboard View](https://github.com/user-attachments/assets/56d3f707-7ea2-4c7c-b304-f084cd2ce8f7)

**Professor View:**
![Professor View](https://github.com/user-attachments/assets/16eb25b9-33f5-4fef-8a12-81db38de2a97)

**Student View:**
![Student View](https://github.com/user-attachments/assets/f76a7ecc-baf8-4461-8991-aa44442f3a68)

***


## Usage

1. Choose your role: **Professor** (full access) or **Student** (view-only, interactive).
2. Professors create or join rooms; students enter the room key provided.
3. Use drawing tools and collaborate live. Export your drawing or save session history.
4. Install to device (PWA) for best performance and offline access.
5. Backend logs health/status, and supports debugging endpoints for development analysis.

***

## Resume Highlights

- **Designed and built a complete collaborative vector whiteboard solution from scratch**
- **Integrated real-time communication and role-based UI controls for scalable classroom management**
- **Ensured accessibility, performance, and mobile support, following modern PWA standards**
- **Implemented robust server (Express/Socket.io), client features, and asset management**
- **Open source, well-documented, and easily adaptable for educational institutions or teams**

***

## 📬 Contact & Links

- **GitHub Repo:** [Vector-Whiteboard](https://github.com/adityaa05/Vector-Whiteboard)
- **Maintainer:** Aditya Patil ([patiladityaa09@gmail.com](mailto:patiladityaa09@gmail.com))
- **Live Demo/Deployment:** (Add public link if hosted)

***

## 📝 License

Licensed under the MIT License.

***
