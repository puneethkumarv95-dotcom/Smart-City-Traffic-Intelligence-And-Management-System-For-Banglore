# Smart City Traffic Intelligence & Management System (SCTIMS)
## Bug Fix & Error Resolution Log

This document records all bugs discovered during project inspection, runtime testing, and test automation, including root cause analysis, modified files, applied fixes, and verified results.

---

### BUG-01: Missing Root Development Script (`npm run dev`)
- **Bug ID:** `BUG-01`
- **Severity:** High
- **Description:** Running `npm run dev` from the main project root resulted in `npm error Missing script: "dev"`.
- **Root Cause:** The root [`package.json`](file:///c:/MERN01/package.json) only contained individual scripts (`dev:server` and `dev:client`), without a parent `"dev"` script or multi-process concurrency manager.
- **Files Modified:** [`package.json`](file:///c:/MERN01/package.json), [`package-lock.json`](file:///c:/MERN01/package-lock.json), [`README.md`](file:///c:/MERN01/README.md)
- **Fix Summary:** 
  1. Installed `concurrently` (`^10.0.6`) in root `devDependencies`.
  2. Configured `"dev": "concurrently -k -n \"SERVER,CLIENT,AI\" -c \"blue.bold,cyan.bold,green.bold\" \"npm run dev:server\" \"npm run dev:client\" \"npm run dev:ai\""`.
  3. Added `"dev:mern"` for running without Python and `"dev:ai"` for the FastAPI microservice.
- **Verification Result:** Verified via background execution; Express (5000), Vite (5173), and FastAPI (8000) start up concurrently and respond with HTTP 200.

---

### BUG-02: Client Vitest Environment Missing JSDOM and Testing Library
- **Bug ID:** `BUG-02`
- **Severity:** Medium
- **Description:** Running `npm --prefix client test` resulted in Vitest execution failure because DOM testing environment (`jsdom`) and testing-library packages were not installed.
- **Root Cause:** Client dependencies lacked `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom`.
- **Files Modified:** [`client/package.json`](file:///c:/MERN01/client/package.json), [`client/package-lock.json`](file:///c:/MERN01/client/package-lock.json)
- **Fix Summary:** Installed `jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` in client `devDependencies`.
- **Verification Result:** Successfully installed and enabled DOM-based component and page testing.

---

### BUG-03: Vitest Config Lacked Environment & Setup Files
- **Bug ID:** `BUG-03`
- **Severity:** Medium
- **Description:** Running `npm test` exited with code 1 because Vitest could not find test files and lacked jsdom environment configuration.
- **Root Cause:** [`client/vite.config.js`](file:///c:/MERN01/client/vite.config.js) did not declare a `test` configuration block, and no test setup file existed.
- **Files Modified:** 
  - [`client/vite.config.js`](file:///c:/MERN01/client/vite.config.js)
  - [`client/src/tests/setup.js`](file:///c:/MERN01/client/src/tests/setup.js)
  - [`client/src/tests/auth.test.jsx`](file:///c:/MERN01/client/src/tests/auth.test.jsx)
  - [`client/src/tests/navigation.test.jsx`](file:///c:/MERN01/client/src/tests/navigation.test.jsx)
- **Fix Summary:** 
  1. Added `test: { globals: true, environment: 'jsdom', setupFiles: ['./src/tests/setup.js'] }` to `vite.config.js`.
  2. Created `client/src/tests/setup.js` importing `@testing-library/jest-dom`.
  3. Implemented 12 comprehensive frontend tests covering authentication forms, role demo buttons, RoleGuard protection, and design system components.
- **Verification Result:** All 12 frontend tests pass cleanly (`Test Files 2 passed, Tests 12 passed`).

---

### BUG-04: AI Microservice Reloader Watched Entire Monorepo
- **Bug ID:** `BUG-04`
- **Severity:** Low
- **Description:** When running `npm run dev`, Uvicorn reported watching `C:\MERN01`, causing the Python service to reload whenever Node.js or React files were saved.
- **Root Cause:** Uvicorn was invoked from the root directory without specifying `--reload-dir ai-service`.
- **Files Modified:** [`package.json`](file:///c:/MERN01/package.json)
- **Fix Summary:** Added `--reload-dir ai-service` to the `dev:ai` script so that FastAPI only triggers hot reload on Python file edits.
- **Verification Result:** Confirmed Uvicorn only watches `ai-service/` for file changes.

---

### BUG-05: Root Package Lacked Unified `npm test` Runner
- **Bug ID:** `BUG-05`
- **Severity:** Low
- **Description:** Running `npm test` from the main project root failed because `"test"` was not defined.
- **Root Cause:** Root `package.json` had `"test:server"` and `"test:client"` but no top-level `"test"` script.
- **Files Modified:** [`package.json`](file:///c:/MERN01/package.json)
- **Fix Summary:** Added `"test": "npm run test:server && npm run test:client"` to root scripts.
- **Verification Result:** `npm test` runs 54 backend integration tests followed by 12 frontend component tests, achieving 66/66 passing tests (100% pass rate).

---

### BUG-06: Port EADDRINUSE Unhandled Crash & Missing Graceful Shutdown
- **Bug ID:** `BUG-06`
- **Severity:** Medium
- **Description:** Abrupt process termination or dev restart left orphaned node processes listening on port 5000, causing unhandled `EADDRINUSE` crash on server startup.
- **Root Cause:** In [`server/src/server.js`](file:///c:/MERN01/server/src/server.js), HTTP server had no `error` event handler and no `SIGINT` / `SIGTERM` listeners to release the socket binding cleanly upon exit.
- **Files Modified:** [`server/src/server.js`](file:///c:/MERN01/server/src/server.js)
- **Fix Summary:** 
  1. Attached `server.on('error', ...)` handler specifically catching `EADDRINUSE` with actionable instructions.
  2. Registered `process.on('SIGTERM', ...)` and `process.on('SIGINT', ...)` handlers that cleanly close HTTP and Socket.IO connections before terminating.
- **Verification Result:** Clean process shutdown and zero lingering port bindings upon termination.


