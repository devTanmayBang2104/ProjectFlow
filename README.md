# ProjectFlow - Project & Workspace Management SaaS

ProjectFlow is a production-ready, full-stack, multi-tenant workspace and project management platform. Designed for collaboration, it allows teams to manage multiple workspaces, run agile project sprints, assign tasks, track real-time analytics, and monitor team activities securely.

---

## 🛠️ Tech Stack

### Frontend (/client)
* **Framework**: React.js (Vite)
* **State Management**: Redux Toolkit (for UI/local state)
* **Data Fetching & Caching**: React Query / TanStack Query (for declarative server state cache synchronization)
* **Styling**: Tailwind CSS & Lucide Icons

### Backend (/server)
* **Runtime & Language**: Node.js & TypeScript
* **Server Framework**: Express.js
* **Database & ORM**: PostgreSQL & Prisma ORM
* **Security & Auth**: JWT (HttpOnly Access & Refresh Cookies), bcryptjs (password hashing), Double-Submit Cookie CSRF Middleware

---

## ✨ Features

* **Multi-Tenant Workspace Partitioning**: Access-isolated workspaces containing separate project pipelines, sprints, members, and activity histories.
* **Agile Sprints & Task Management**: Create and track sprints, organize tasks (TODO, IN_PROGRESS, DONE), prioritize work (LOW, MEDIUM, HIGH), and assign duties.
* **Production-Grade Auth & Security**:
  * Dual-Token JWT flow utilizing secure `HttpOnly` and `SameSite` cookie storage to prevent XSS.
  * Hashed database session storage with **Refresh Token Rotation (RTR)** to detect and revoke hijacked session replays.
  * Double-Submit CSRF cookie checking to secure state-modifying requests.
  * Brute-force protection: locks accounts for 15 minutes after 5 failed login attempts.
  * Google OAuth 2.0 sign-in support.
* **Workspace & Project Team Controls**: Invite workspace members globally and link them to projects with active member removal tools.
* **Activity Audit Logs & Live Alerts**: Track user actions in workspace timelines and deliver real-time notifications.
* **Analytics & Calendar View**: Interactive stats dashboards and deadline schedules.

---

## 📁 Monorepo Structure

* `client/` - React frontend application
* `server/` - Node.js + Express TypeScript backend server

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js (v18+)
* PostgreSQL database instance

### 2. Installation
Install dependencies in both directories:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 3. Database Setup (Server)
Create a `.env` file in the `server` directory using the provided `.env.example` template:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://username:password@localhost:5432/dbname"
JWT_ACCESS_SECRET="secure_random_access_string"
JWT_REFRESH_SECRET="secure_random_refresh_string"
```

Run database migrations to generate database tables:
```bash
npx prisma migrate dev --name init
```

### 4. Running the Application
Start both development servers:
```bash
# Run server (from /server)
npm run dev

# Run client (from /client)
npm run dev
```

The frontend will run on `http://localhost:5173` and the backend server on `http://localhost:5000`.

---

## 📜 License
Licensed under the MIT License. See [LICENSE.md](./LICENSE.md) for details.
