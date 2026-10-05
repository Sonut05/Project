# RentIt 🤝 (P2P Daily Items Rental Full-Stack Application)

Welcome to **RentIt**! RentIt is a peer-to-peer neighborhood item rental platform built with a modern full-stack architecture using **React (Vite)** on the frontend and **Node.js (Express)** with **Prisma ORM** and **PostgreSQL** on the backend.

---

## 🏗️ Architecture & Technology Stack

* **Frontend**: React 18, Vite, React Router 6, Leaflet Maps, Lucide Icons, Vanilla CSS design system
* **Backend API**: Node.js, Express, Helmet security headers, CORS allowlist, Multer image upload processing
* **Database & Persistence**: PostgreSQL, Prisma ORM with versioned migrations, atomic transactions, advisory transaction locks
* **Authentication & Security**: Secure HTTP-only cookies, short-lived JWT access tokens, server-tracked SHA-256 hashed refresh sessions with automatic rotation and replay detection, bcrypt password hashing

---

## 📂 Project Structure

```
/project-root
  │
  ├── 💻 /frontend                    # USER INTERFACE (React + Vite)
  │     ├── /public                  # Static assets (SVG placeholders, favicons)
  │     ├── /src
  │     │    ├── /api                # API client modules with single-flight refresh & AbortController
  │     │    ├── /components         # UI components (Navbar, Modals, ItemCard, Onboarding, etc.)
  │     │    ├── /context            # AuthContext with in-memory access token management
  │     │    ├── /pages              # Routed views (Browse, ItemDetail, Requests, History, Profile)
  │     │    ├── /utils              # Date utilities (timezone-safe YYYY-MM-DD), image URL resolver
  │     │    ├── App.jsx             # Main router and application shell
  │     │    └── main.jsx            # React root mount
  │     ├── index.html               # Semantic HTML entry point
  │     ├── vite.config.js           # Vite build and test configuration
  │     └── package.json             # Frontend dependencies and scripts
  │
  ├── ⚙️ /backend                     # REST API SERVER (Node.js + Express + Prisma)
  │     ├── /prisma
  │     │    ├── schema.prisma       # Prisma schema (User, Item, RentalRequest, Review, Activity, RefreshSession)
  │     │    ├── /migrations         # Version-controlled SQL migrations
  │     │    └── seed.js             # Database seeding script
  │     ├── /src
  │     │    ├── /config             # Validated environment configurations
  │     │    ├── /controllers        # Request controllers (auth, users, items, requests, reviews, messages, geocode, upload)
  │     │    ├── /db                 # Prisma database client instance
  │     │    ├── /middleware         # Auth verification, rate limiting, logging, error handling
  │     │    ├── /routes             # Express route modules
  │     │    ├── /utils              # Date validation, error classes
  │     │    ├── app.js              # Express app setup, CORS, Helmet, routes mounting
  │     │    └── server.js           # HTTP server initialization and graceful shutdown
  │     ├── /tests                   # Vitest unit and integration tests
  │     ├── Dockerfile               # Multi-stage production container image
  │     └── package.json             # Backend dependencies and scripts
  │
  ├── package.json                   # Workspace runner scripts
  └── README.md                      # Project documentation
```

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
npm install --prefix frontend
npm install --prefix backend
```

### 2. Environment Configuration
Copy `.env.example` templates to local `.env` files:

In `backend/.env`:
```env
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/rentit
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=your-access-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here
GEOCODER_URL=https://nominatim.openstreetmap.org/search
GEOCODER_USER_AGENT=RentIt-P2P-App/1.0
UPLOAD_DIR=uploads
```

In `frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Database Migrations & Client Generation
```bash
npm run prisma:generate --prefix backend
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

### 4. Run Development Servers
```bash
npm run dev
```

* **Frontend UI**: [http://localhost:5173](http://localhost:5173)
* **Backend API**: [http://localhost:5000](http://localhost:5000)
* **Health Check**: [http://localhost:5000/health](http://localhost:5000/health)
* **Readiness Check**: [http://localhost:5000/ready](http://localhost:5000/ready)

---

## 🧪 Testing & Code Quality

Run tests and linters across the project:
```bash
# Frontend tests & linting
npm test --prefix frontend
npm run lint --prefix frontend

# Backend tests
npm test --prefix backend
```

---

## 🐳 Docker Deployment

The backend includes a production-grade multi-stage Dockerfile:
```bash
docker build -t rentit-backend ./backend
docker run -p 5000:5000 --env-file ./backend/.env rentit-backend
```
The container runs as an unprivileged non-root user (`rentit`), includes automated healthchecks against `/health`, and handles graceful shutdown signals (`SIGINT`/`SIGTERM`).
