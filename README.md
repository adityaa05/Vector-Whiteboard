***

# VectraSync

**Collaborative, Real-Time Digital Whiteboard**

VectraSync is an open-source, real-time collaborative whiteboard tailored for classrooms, teams, and remote learning. Featuring live drawing, interactive roles, seamless multi-user sync, and installable PWA support—perfect for education, brainstorming, and teamwork.

***

## Features

- **Live Drawing Tools:** Pencil, shapes, text, color picker, multi-width strokes
- **Role-Based Collaboration:** Professor (full access) & Student (view-only, interactive) modes
- **Real-Time Sync:** Instant updates between all users, powered by Socket.io
- **Export/Import:** Save sessions as PNG/SVG/JSON; reload anytime
- **Undo/Redo & Grid System:** Precision editing and drawing history
- **Mobile & PWA Support:** Offline use, installable app banner, responsive UI
- **Notifications & Status:** In-app alerts, connection indicators, and user management

***

## Tech Stack

- **Frontend:** HTML, CSS (CSS Grid/Flexbox, responsive, dark mode), Vanilla JavaScript (ES6)
- **Backend:** Node.js, Express.js, Socket.io
- **PWA:** Manifest, Service Worker
- **Other:** Local Storage, Clipboard API, REST Debug Endpoints

***

## Installation

```bash
# Clone the repository
git clone https://github.com/adityaa05/VectraSync.git
cd VectraSync

# Install server dependencies
npm install

# Start the backend server
node server.js

# Open index.html in your browser OR deploy the project using Netlify/Render for public hosting
```
*Note:* The project can be installed as a PWA by opening the app in Chrome/Edge and clicking "Install" for offline access.

***

## Screenshots

![Main Whiteboard View](https://github.com/user-attachments/assets/56d3f707-7ea2-4c7 View:**
![Professor View](https://github.com/user-attachments/assets/16eb25b9-33f5-4fef View:**
![Student View](https://github.com/user-attachments/assets/f76a7ecc-baf8-446

## Usage

1. Choose your role: **Professor** (full access) or **Student** (view-only).
2. Professors create or join rooms; students enter the room key provided by the professor.
3. Draw, annotate, and collaborate live. Export your session or reload at any time.
4. Install the app for offline and mobile-friendly usage.
5. Backend provides live logging, health checks, and debugging endpoints.

***

## Key Achievements

- Developed VectraSync from scratch: a scalable, multi-user whiteboard for interactive education and remote collaboration.
- Engineered robust role-based participation, enabling effective teaching and student engagement.
- Implemented instant, real-time sync with Socket.io and intuitive drawing tools.
- Ensured accessibility, responsive design, and cross-device compatibility through PWA standards.
- Published as open-source, with modular architecture and documentation for easy adaptation.

***

## Contact & Links

- **GitHub Repo:** [VectraSync](https://github.com/adityaa05/VectraSync)
- **Maintainer:** Aditya Patil ([patiladityaa09@gmail.com](mailto:patiladityaa09@gmail.com))
- **Live Demo/Deployment:** https://vector-whiteboard.onrender.com

***

## License

Licensed under the MIT License.

***
