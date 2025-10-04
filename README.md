# TASKER — Client (React + Vite)

This repository contains the client-side web application for TASKER, a lightweight task and space management app built with React and Vite and using Firebase for Authentication and Firestore as the backend data store.

This README documents how to run, develop, and deploy the client app, plus where to find important files and how the main pieces (spaces, tasks, notes, members) are wired.

---

## Table of contents

- About
- Features
- Prerequisites
- Quick start
- Firebase configuration
- Available scripts
- Project structure (high level)
- Key files and what to edit
- Notes on environment / deployment
- Troubleshooting
- Next steps

---

## About

The TASKER client is a Vite + React app that provides an interface for creating and managing 'spaces' (workspaces), tasks inside those spaces, member management (admin flows), and collaborative notes. It integrates with Firebase for authentication and Firestore for persistence.

This client is intended to be run alongside the project's Firebase backend configuration (already included in `client/firebase.js`). Make sure your Firebase project is properly set up and the Firestore rules allow the operations your app expects in development.

## Features

- User authentication (Firebase Auth)
- Spaces listing (user and admin views)
- Task board (To-Do, In Progress, Completed) with drag-and-drop
- Task creation, edit (client-side), status updates and delete
- Members management (admin flows)
- Real-time notes for each space with auto-save
- Toast notifications and confirmation dialogs

## Prerequisites

- Node.js 18+ (recommended)
- npm (or yarn)
- An active Firebase project (Firestore and Authentication enabled)

Note: The project ships a sample `client/firebase.js` that initializes an example Firebase app. Replace these settings with your own Firebase project's config for production.

## Quick start (development)

1. Open a terminal and navigate to the client folder:

```powershell
cd "c:\Users\gurun\Documents\TASK-MANAGEMENT\client"
```

2. Install dependencies:

```powershell
npm install
```

3. Start the dev server (Vite):

```powershell
npm run dev
```

4. Open the app at the URL Vite prints (normally `http://localhost:5173`).

## Firebase configuration

The client includes `client/firebase.js` which initializes the Firebase SDK. Replace the `firebaseConfig` object in `client/firebase.js` with your own project's config (found in the Firebase Console -> Project Settings).

Important Firebase services used:

- Authentication (email/password)
- Firestore (collections used by the app): `users`, `spaces`, `tasks`.

If you change Firestore collection names or the data model, update the helper functions in `client/firebase/Space_management.js` accordingly.

## Available scripts

- `npm run dev` — Start Vite dev server with HMR
- `npm run build` — Build for production (Vite)
- `npm run preview` — Preview production build locally
- `npm test` — (none provided by default; add tests as needed)

These scripts are defined in `client/package.json`.

## Project structure (important files)

- `client/` — root of the frontend app
  - `index.html` — Vite entry
  - `src/` — React source code
    - `main.jsx` — App bootstrap and router
    - `App.jsx` — Routes (admin and user routes are defined here)
    - `App.css`, `index.css` — global styles
    - `pages/` — top-level pages
      - `SpacePage.jsx` — Admin space view (full features)
      - `pages/user/UserSpacePage.jsx` — User's space view (task board + notes). This file was recently updated to ensure notes are visible on the right side mirroring the admin page.
      - `pages/user/UserDashboard.jsx` — User dashboard with spaces list
      - `pages/admin/Dashboard.jsx` — Admin dashboard
    - `components/` — reusable components
      - `ConfirmDialog.jsx` — confirmation modal
      - `MembersManagement.jsx` — member add/remove UI (admin)
      - `ThemeToggle.jsx` — theme switch (if present)
    - `contexts/toast/` — Toast provider and container
    - `firebase/Space_management.js` — Firebase helpers for spaces, tasks, notes, members
  - `firebase.js` — Firebase SDK init (replace with your project's config)

## Key files to inspect or edit

- `client/firebase.js` — Update with your Firebase config
- `client/firebase/Space_management.js` — Contains functions used across pages to create/fetch/update/delete spaces, tasks and notes. Extend this file if you add new Firestore fields or behaviors.
- `client/src/pages/SpacePage.jsx` — Admin view with members and notes
- `client/src/pages/user/UserSpacePage.jsx` — User view (task board + notes). This file was recently updated to ensure notes are visible on the right side mirroring the admin page.
- `client/src/contexts/toast/ToastContext.jsx` — Toast hooks used for user feedback
- `client/src/components/ConfirmDialog.jsx` — Generic confirm dialog used across delete flows

## Notes on environment & deployment

- For production builds, update `client/firebase.js` with your production Firebase configuration and confirm Firestore rules limit access appropriately.
- If you plan to deploy to Vercel / Netlify / Firebase Hosting, the standard Vite build output in `dist/` is compatible with static hosting. Use the platform-specific instructions to deploy the `dist/` folder.

## Troubleshooting

- "Failed to resolve import" errors: ensure relative import paths are correct in files under `src/pages/*`. Recent edits fixed a path in `UserSpacePage.jsx` to correctly import `firebase` and helpers.
- Permissions / Firestore rules: if you see permission denied errors when reading or writing, check Firestore rules in the Firebase console and confirm authenticated user permissions.
- Auth redirect loops: confirm that `onAuthStateChanged` calls `navigate('/login')` only when `currentUser` is null.

## Next steps / Improvements

- Add `updateTask` server helper to `Space_management.js` so task edits persist to Firestore rather than only client-side edits.
- Add tests (Jest + React Testing Library) for critical UI flows (create/delete task, notes save).
- Add type safety (TypeScript) and stronger linting rules.

---

If you want, I can also:

- Add a short CONTRIBUTING.md with development conventions.
- Create a sample `.env.example` for protecting Firebase credentials (the file currently stores Firebase config in `client/firebase.js`).

If you'd like any of those follow-ups, say which and I'll add them.
