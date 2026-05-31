# RentIt 🤝 (P2P Daily Items Rental Full-Stack Application)

Welcome to **RentIt**! This project has been restructured to be **simple, clean, and 100% beginner-friendly**. It demonstrates a standard, industry-grade Full-Stack (MERN-style) architectural split using **React (Vite)** on the frontend and **Node.js (Express)** on the backend.

---

## 📂 Simplified File Structure

Here is a simple breakdown of the project layout so you can navigate it with ease:

```
/project-root
  │
  ├── 💻 /frontend            # USER INTERFACE (React + Vite)
  │     ├── /public          # Static files served directly (icons, browser assets)
  │     ├── /src             # Frontend source code
  │     │    ├── /assets     # Media files like logos and pictures
  │     │    ├── /components # Reusable layout components (Navbar, Modal, cards)
  │     │    ├── /pages      # Screen components (Dashboard, Browse, Requests)
  │     │    ├── /utils      # Helper files & local database engine (mockDb.js)
  │     │    ├── App.jsx     # Main React component & layout controller
  │     │    ├── main.jsx    # JavaScript entry point loading React into the HTML
  │     │    └── index.css   # Main stylesheet
  │     ├── index.html       # Single Page Application HTML shell
  │     ├── vite.config.js   # Vite development compiler configurations
  │     └── package.json     # Frontend dependencies (React, Leaflet Map, Lucide Icons)
  │
  ├── ⚙️ /backend             # SERVER & API (Node.js + Express)
  │     ├── /src
  │     │    └── server.js   # Express server setting up routing and REST endpoints
  │     └── package.json     # Backend dependencies (Express, CORS, Nodemon compiler)
  │
  ├── package.json           # Root runner to install & start both projects easily
  └── README.md              # This guide!
```

---

## 🚀 Getting Started (Run with 1 Command!)

We have set up automation scripts so you don't have to open separate terminal windows. Follow these simple steps:

### 1. Install Developer Runner
Open your terminal in the **root folder** and install the development runner (`concurrently`):
```bash
npm install
```

### 2. Install Project Dependencies
Run this custom command to automatically install all dependencies inside both the `/frontend` and `/backend` folders:
```bash
npm run install-all
```

### 3. Start Both Servers
Run the development command. This starts both the React UI and the Express backend API simultaneously!
```bash
npm run dev
```

* **Frontend UI URL**: [http://localhost:5173](http://localhost:5173) (Open this in your browser)
* **Backend API URL**: [http://localhost:5000](http://localhost:5000) (Serves your APIs)

---

## 🎓 Learning Points for Beginners

### 1. What is the difference between `/src` in frontend and backend?
* **`frontend/src`**: Contains visual React components, layouts, pages, and interactive UI logic that runs directly **inside the user's web browser**.
* **`backend/src`**: Contains server-side code (Node/Express API endpoints) that runs on the **host machine/server**. It handles business calculations, database security, and serving raw data.

### 2. What is CORS and why is it in `backend/src/server.js`?
CORS stands for **Cross-Origin Resource Sharing**. By default, web browsers block web apps running on one address (like `localhost:5173`) from making calls to a server on another address (like `localhost:5000`).
The backend uses:
```javascript
app.use(cors());
```
to tell the browser: *"It's safe to let our React frontend read our API data!"*

### 3. Database vs. Local Storage
* **Local Storage (`mockDb.js`)**: Currently, the frontend React app stores interactive rental data directly inside your browser's local cache. This is perfect for immediate play and keeps data intact even when reloading pages.
* **Server API Database (`server.js`)**: The Express backend serves as a blueprint of a real server. It handles APIs like `/api/items` to show how you would serve products from a centralized database in a production application.
