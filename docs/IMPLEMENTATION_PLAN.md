# Smart City Traffic Intelligence & Management System (SCTIMS)
## Comprehensive Implementation Plan & Architecture Specification

**Project Level:** MCA Final-Year Major Project  
**Target City Demonstration:** Bengaluru (Majestic, Hebbal, Silk Board, Whitefield, Electronic City, Yelahanka)  
**System Architecture:** Decoupled Monorepo (React Client + Express/MongoDB Server + FastAPI AI Microservice)

---

## 1. System Architecture & Component Interactions

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                      |
|  React 18 + Vite + Tailwind CSS + Lucide Icons + React Leaflet + Socket.io Client  |
|  5 Dedicated Role Portals: Citizen, Police, Emergency, Parking Operator, Admin    |
+----------------------------------------+------------------------------------------+
                                         |  HTTPS / WSS
                                         v
+----------------------------------------+------------------------------------------+
|                             API GATEWAY & BACKEND                                 |
|  Node.js + Express.js + Socket.IO Server                                          |
|  - JWT Authentication (Access + Refresh Token Rotation)                           |
|  - Role-Based Access Control (RBAC) Guard Middleware                              |
|  - Domain Controllers: Auth, Incidents, Traffic, Parking, Emergency, Analytics     |
|  - GeoJSON 2dsphere Geospatial Engine                                             |
|  - Audit Logger & System Metrics                                                  |
+-------------------+-----------------------------------+---------------------------+
                    |                                   |
         Mongoose / MongoDB                             | HTTP Internal RPC
                    v                                   v
+-------------------+---------------+   +---------------+---------------------------+
|          DATABASE LAYER           |   |            AI & ML SERVICE                |
|  MongoDB Atlas / Local Server     |   |  Python FastAPI + scikit-learn + OpenCV   |
|  - 22 Specialized Collections     |   |  - Vehicle Counter (Computer Vision)      |
|  - 2dsphere Geospatial Indexes    |   |  - NLP Incident Categorization & Dups     |
|  - ACID Multi-Document Txns       |   |  - Time-series Traffic Prediction         |
+-----------------------------------+   |  - Signal Simulation & Accident Risk      |
                                        +-------------------------------------------+
```

---

## 2. Technology Choices & Justification

| Layer | Technology | Justification |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, Lucide | Instant HMR, lightweight modern bundle, utility-first styling with smart-city dark mode aesthetic. |
| **State & Data Fetching** | Zustand, TanStack Query | Minimal boilerplate for auth/UI global state + robust caching/retry for server queries. |
| **Maps & Geospatial** | React Leaflet, OpenStreetMap Leaflet tiles | Industry-standard open-source map engine with zero API key billing limits, GeoJSON overlays, heatmaps, and routing polylines. |
| **Backend API** | Node.js, Express.js | High-throughput async I/O, rich ecosystem for geospatial MongoDB manipulation, rapid REST design. |
| **Real-time** | Socket.IO (Authenticated Rooms) | WebSockets with fallback, channel/room broadcasting partitioned by city zones and roles. |
| **Database** | MongoDB Atlas / Local Server with Mongoose | Native GeoJSON `Point` & `Polygon` spatial indexes (`2dsphere`), schema flexibility for multimodal traffic & incident records. |
| **AI / Computer Vision** | Python 3, FastAPI, scikit-learn, OpenCV | Python is the undisputed ML standard; FastAPI provides sub-millisecond async endpoints consumed by Node backend. |
| **Security & Auth** | Argon2/Bcrypt, JWT Access + Refresh Rotation, Helmet, Rate-Limit | Enterprise-grade token lifecycle, protection against XSS/CSRF/replay attacks. |

---

## 3. Six-Phase Phased Delivery Roadmap

### Phase 1: Foundation & Design System (Current Focus)
- [x] Project structure initialization (monorepo root, client, server, ai-service).
- [x] Shared UI Design System: Deep navy dark theme `#0b1120`, electric blue `#0ea5e9`, neon cyan `#06b6d4`, status indicators (emerald `#10b981`, amber `#f59e0b`, rose `#f43f5e`).
- [x] MongoDB Connection establishment with graceful fallback & health check.
- [x] Full RBAC Authentication: Citizen, Traffic Police, Emergency Responder, Parking Operator, Super Administrator.
- [x] Portals setup: 5 role-gated responsive layouts with sidebar, topbar, breadcrumbs, search, notification dropdown.
- [x] Seed script for Bengaluru zones and default credentials.
- [x] Phase 1 Unit/Integration tests.

### Phase 2: Core Incident Management & Verification (Completed & Verified)
- [x] Comprehensive incident reporting schema with GeoJSON 2dsphere indexing (`INC-YYYYMM-XXXX`).
- [x] Multi-category reporting with photo/media upload handling (Multer disk storage + size/MIME guards).
- [x] Location picker with interactive Leaflet map, draggable pin, GPS geolocation, and Nominatim reverse geocoding.
- [x] Verification workflow: Submitted -> Under Review / Info Requested -> Verified -> Assigned -> In Progress -> Resolved / Rejected.
- [x] Workload-balanced officer dispatch creating dedicated `IncidentAssignment` records.
- [x] Citizen community voting (confirm/dispute) with 1-active-vote guard and vote-change support.
- [x] Heuristic community consensus (5+ confirmations auto-promotes to `under_review`).
- [x] Smart duplicate detection engine combining geospatial proximity, time window, category, and Jaccard token text similarity.
- [x] Citizen post-resolution satisfaction rating (1-5 stars) and feedback review.
- [x] Super Admin incident aggregation statistics with MongoDB aggregation pipelines.
- [x] Audit logging in `IncidentStatusHistory` and `AuditLog` of all actor transitions.
- [x] Automated backend integration tests: 34/34 passing. React client build: 0 errors.

### Phase 3: Live Traffic, Maps & Real-Time Sync
- React Leaflet smart city live map with real-time incident markers.
- Incident concentration heatmaps with geospatial aggregation.
- Real-time road closures, diversions, and Socket.IO live sync.
- Alternative routes calculation and saved routes for citizens.

### Phase 4: Command Center & Emergency Dispatch
- Traffic Police Command Center dashboard with live incident feeds and SLA countdowns.
- Shift schedules, duty management, and complaint escalation rules.
- Emergency Responder dispatch console with prioritized routing simulation.
- Multilingual i18n support (English, Kannada, Hindi) and PWA manifest.

### Phase 5: AI Microservice & Predictive Mobility
- FastAPI Python microservice integration.
- Video/footage vehicle counting via computer vision.
- Incident text NLP classification and duplicate detection.
- Adaptive traffic signal simulation engine (fixed-time vs adaptive comparison).
- Time-series traffic congestion forecasting and road segment accident risk scoring.

### Phase 6: Smart Parking, Analytics, Final Verification & Polishing
- Smart parking operator management, slot reservations, real-time occupancy.
- City-wide analytics with Recharts (trends, hotspots, officer workloads).
- Weather hazard alerts and AI Traffic Assistant conversational helper.
- Automated test suites, Docker configuration, API documentation (Swagger/OpenAPI).

