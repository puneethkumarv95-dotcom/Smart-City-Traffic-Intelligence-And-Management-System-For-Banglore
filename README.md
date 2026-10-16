# Smart City Traffic Intelligence & Management System (SCTIMS)

**MCA Major Final-Year Project**  
*A Full-Stack Geospatial, Real-Time Urban Traffic & Emergency Management System for Bengaluru Smart City*

---

## 🚦 System Overview

SCTIMS is a high-performance web platform designed to interconnect municipal stakeholders—Citizens, Traffic Police, Emergency Responders, Parking Operators, and Urban Administrators.

- **City Demonstration Grid:** Bengaluru (Majestic, Hebbal, Silk Board, Whitefield, Electronic City, Yelahanka)
- **Monorepo Architecture:**
  - `client/`: React 18, Vite, Tailwind CSS, Leaflet, Socket.IO Client, Zustand
  - `server/`: Node.js, Express, MongoDB Atlas / Mongoose, Socket.IO, JWT + Refresh Token Rotation
  - `ai-service/`: Python FastAPI, scikit-learn, OpenCV (Computer Vision & Traffic Simulation)
  - `docs/`: Technical specifications, architecture plan, and 42-feature implementation checklist

---

## 🔐 Demonstration Accounts (Password for all: `Password@123`)

The database seed automatically provisions 5 distinct role accounts with fine-grained access:

| Role | Account Email | Operational Scope |
| :--- | :--- | :--- |
| **Citizen** | `citizen@smartcity.gov` | Hazard reporting, community verification, live map, SOS |
| **Traffic Police** | `police@smartcity.gov` | Incident verification, patrol dispatch, road closures, triage queue |
| **Emergency** | `emergency@smartcity.gov` | 108 GVK dispatch console, priority siren routing simulation |
| **Parking Operator** | `operator@smartcity.gov` | Multi-level facility management, slot telemetry, bookings |
| **Super Admin** | `admin@smartcity.gov` | Global user & role access, officer approvals, zone setup, audit logs |

*Note: The Login page contains one-click demo login buttons to instantly switch between all 5 operational roles without manual typing.*

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18+ (tested on v24.x)
- **MongoDB**: MongoDB 6.0+ running locally or MongoDB Atlas connection string
- **Python**: 3.10+ (for AI microservice)

### 2. Install Dependencies
```bash
# In server directory:
cd server
npm install

# In client directory:
cd ../client
npm install
```

### 3. Seed Demonstration Database
```bash
# Seed 6 Bengaluru zones and 5 role demonstration accounts:
npm --prefix server run seed
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend API & Socket.IO (Port 5000)
npm --prefix server run dev

# Terminal 2: React Vite Frontend (Port 5173)
npm --prefix client run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing
```bash
# Run backend test suite (Auth, RBAC, Token Rotation, Health check):
npm --prefix server test

# Verify client production build:
npm --prefix client run build
```

---

## 📑 Project Documentation
- **Architecture & Implementation Plan:** [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- **42-Feature Implementation Checklist:** [`docs/FEATURE_CHECKLIST.md`](docs/FEATURE_CHECKLIST.md)

