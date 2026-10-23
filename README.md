# ProjectFlow - Scalable Workspace & Project Management SaaS

[![Live Demo](https://img.shields.io/badge/Demo-Live_on_Vercel-black?style=for-the-badge&logo=vercel)](https://project-flow-nu-wine.vercel.app)
[![API Status](https://img.shields.io/badge/API-Live_on_Render-46E3B7?style=for-the-badge&logo=render)](https://projectflow-0iqy.onrender.com/health)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-50_Passed-emerald?style=for-the-badge&logo=vitest)](https://vitest.dev/)

ProjectFlow is a production-grade, full-stack, multi-tenant workspace and project management SaaS designed for high-performance team collaboration. Built with **React 19**, **Node.js**, **Express**, **TypeScript**, and **PostgreSQL (Prisma ORM)**, it features interactive sprint tracking, a real-time drag-and-drop Kanban board, and a sub-millisecond **Redis caching layer**.

---

## 🌐 Live Deployments

* **Frontend Application**: [https://project-flow-nu-wine.vercel.app](https://project-flow-nu-wine.vercel.app)
* **Backend API & WebSockets**: [https://projectflow-0iqy.onrender.com](https://projectflow-0iqy.onrender.com)
* **Cloud Database**: Serverless PostgreSQL on Neon (AWS `us-east-1`)

---

## 🛠️ Tech Stack & Architecture

### Frontend (`/client`)
* **Framework**: React 19, Vite
* **State Management**: Redux Toolkit (local UI & theme state)
* **Data Fetching & Optimistic Cache**: TanStack React Query v5
* **Real-time Sync**: Socket.IO Client (bidirectional event subscriptions)
* **Styling**: Tailwind CSS v4, Lucide Icons, Date-fns, Recharts

### Backend (`/server`)
* **Runtime & Language**: Node.js, TypeScript (Strict Mode)
* **API Framework**: Express.js with reverse-proxy trust
* **Database & ORM**: PostgreSQL with Prisma ORM & Connection Pooling
* **Caching Layer**: Redis (ioredis) with Cache-Aside pattern & resilient In-Memory TTL fallback
* **Real-Time Engine**: Socket.IO (room-partitioned workspace events)
* **Background Jobs**: Node-cron (automated daily cleanup of soft-deleted records)
* **File Storage**: Cloudinary SDK (with local disk fallback)

---

## ✨ Core Features

### 1. 🗂️ Interactive Drag-and-Drop Kanban Board
* Visual workflow board across **To Do**, **In Progress**, and **Done** columns matching clean SaaS aesthetics.
* **0ms Optimistic UI Updates**: Cards land in target columns instantaneously upon release, updating React Query in-memory cache before background persistence.
* **Real-Time Socket Synchronization**: When a teammate moves a card, other connected users' boards update in **~100–200ms** via WebSocket push without expensive HTTP refetches.
* Multi-attribute filtering by **Type**, **Priority**, and **Assignee**.

### 2. ⚡ High-Throughput Redis Caching Layer
* **Cache-Aside Architecture**: Caches read-heavy workspace project lists and project detail views involving multi-table joins.
* **Sub-Millisecond Read Latency**: Drops read query response times from $\sim$150–250ms (remote AWS network roundtrip) down to **<1ms** ($O(1)$ in-memory lookups).
* **Event-Driven Pattern Invalidation**: Automated wildcard cache clearing (`projects:workspace:*`, `project:*`) on project, sprint, or task mutations.
* **Dual-Mode Deployment Resilience**: Connects to Redis/Upstash in production, and automatically falls back to an in-memory TTL store if Redis is unavailable.

### 3. 🛡️ Production-Grade Security & Authentication
* **Dual-Token JWT Architecture**: Short-lived access tokens (15m) paired with long-lived refresh tokens (7d) stored strictly in `HttpOnly`, `SameSite: None`, `Secure` cookies.
* **Refresh Token Rotation (RTR)**: Detects token reuse and instantly invalidates compromised session families.
* **Origin-Aware Double-Submit CSRF Protection**: Validates anti-CSRF tokens and cross-domain origins for decoupled deployments.
* **Google OAuth 2.0**: Full consent screen authorization flow with dynamic redirect resolution.
* **Brute-Force Account Protection**: Automatically locks accounts for 15 minutes after 5 consecutive failed login attempts.
* **Rate Limiting**: Multi-tier IP rate limits protecting authentication and API endpoints.

### 4. 🏢 Multi-Tenant Workspaces & Granular RBAC
* Access-isolated workspaces with strict hierarchical server-side authorization:
  * **Workspace Owner / Admin**: Workspace settings, member invitations, project creation.
  * **Team Lead**: Sprint lifecycle management, task assignments, checklist modifications.
  * **Member**: Task transitions, checklist toggles, comments, and file attachments.

### 5. 🔄 Git-Integrated CI/CD & Automated Deployment
* **Automated Git Builds**: Pushes to `main` automatically trigger concurrent production builds on **Vercel** (frontend Edge CDN) and **Render** (backend API).
* **Zero-Downtime Rollback Protection**: Existing live traffic remains uninterrupted during builds; broken commits fail safely without taking the service down.
* **Cross-Domain Handshake**: Built-in support for reverse proxies (`trust proxy`), partitioned authentication cookies, and live WebSockets across different domains.

### 6. 🏃 Agile Sprint Planning & Analytics
* Dedicated sprint planning dashboard to create, start, and complete sprint cycles.
* Project backlog for unassigned tasks with one-click sprint movement.
* Real-time sprint progress tracking, burndown metrics, and project calendar schedules.

---

## 🧪 Automated Testing Suite

Comprehensive testing implemented with **Vitest** and **React Testing Library**:

* **Backend Unit & Integration Tests (40 Passed)**:
  * Cryptographic hashing & JWT lifecycle (`auth.test.ts`)
  * Hierarchical RBAC permissions & deletion rules (`rbac.test.ts`)
  * Double-Submit CSRF & Rate Limit middleware (`middleware.test.ts`)
  * Cache service set, get, TTL expiry & pattern invalidation (`cache.test.ts`)
  * Schema & input request validators (`validators.test.ts`)
  * Daily midnight database cleanup jobs (`cron.test.ts`)
* **Frontend Component & State Tests (10 Passed)**:
  * Redux UI & Theme state slices (`slices.test.js`)
  * API client interceptors & CSRF headers (`apiClient.test.js`)
  * Component UI rendering & OAuth states (`components.test.jsx`)

```bash
# Run server test suite
cd server && npm test

# Run client test suite
cd client && npm test -- --run
```

---

## 🚀 Local Development Setup

### 1. Prerequisites
* Node.js (v18+)
* PostgreSQL database instance (local or cloud e.g., Neon)
* Redis (optional; built-in in-memory fallback activates automatically)

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/devTanmayBang2104/ProjectFlow.git
cd ProjectFlow

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory:
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL="postgresql://user:password@localhost:5432/projectflow"
JWT_ACCESS_SECRET="your_access_secret"
JWT_REFRESH_SECRET="your_refresh_secret"
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_CALLBACK_URL="http://localhost:5173/google-callback"
REDIS_URL="redis://127.0.0.1:6379" # Optional
```

### 4. Database Migrations
```bash
cd server
npx prisma migrate dev --name init
npm run prisma:seed # (Optional sample data)
```

### 5. Start Development Servers
```bash
# Run backend (from /server)
npm run dev

# Run frontend (from /client in a separate terminal)
npm run dev
```

Visit `http://localhost:5173` to explore the application locally.

---

## 📜 License
This project is licensed under the MIT License.
