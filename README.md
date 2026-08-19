# 🚀 CollabSheets — The All-in-One Collaborative Workspace

<div align="center">

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

**A real-time collaborative workspace combining code editor, documents, slides, spreadsheets, whiteboard, video calls, and team chat — all in one browser tab.**

[Live Demo](https://collabsheets.onrender.com) • [Report Bug](https://github.com/NejamulHaque/collabsheets/issues) • [Request Feature](https://github.com/NejamulHaque/collabsheets/issues)

</div>

---

## ✨ Features

### 📝 Multi-Mode Editor
- **💻 Code Editor** — CodeMirror with 40+ languages, syntax highlighting, autocomplete, live cursors
- **📄 Documents** — TipTap rich text with tables, task lists, images, fonts, formatting
- **📊 Slides** — PowerPoint-style collaborative presentations
- **📈 Sheets** — Excel-like spreadsheets with formulas
- **🎨 Whiteboard** — Real-time collaborative drawing with pen, eraser, colors

### 👥 Real-Time Collaboration
- **Live multiplayer editing** via [Yjs](https://yjs.dev/) CRDTs
- **Presence awareness** — see who's editing, with colored cursors and names
- **Team video calls** — WebRTC peer-to-peer with camera, mic, screen sharing
- **Team chat** — instant push + persistent history with correct local timezones
- **Incoming call notifications** — ringing banner invites teammates to join

### 🤖 AI & Developer Tools
- **AI Assistant** — code generation, explanations, refactoring, translations
- **Code Review** — static analysis with severity levels
- **Debug Run** — Python breakpoints with live variable inspection
- **Git Integration** — commit, branch, push from inside the editor
- **Code Execution** — run Python, JS, and more directly in the browser

### 🔐 Sharing & Security
- **Share links** with view/edit permissions (login-required)
- **JWT authentication** with secure password hashing
- **Role-based access** — owner, editor, viewer
- **Admin dashboard** with user management

### 🎨 User Experience
- **Command Palette** (`Ctrl+K`) — search any action instantly
- **Dark/Light themes** + custom theme import (`.json`)
- **Mail Merge** — generate documents from templates
- **Version history** — restore any previous snapshot
- **Fullscreen mode** + print/PDF export

---

## 📸 Screenshots

| Dashboard | Document | Presentation | Excel | Whiteboard
|---|---|---|---|---|
| ![dashboard](docs/dashboard.jpg) | ![doc](docs/doc.jpg) | ![presentation](docs/presentation.jpg) | ![excel](docs/excel.jpg) | ![whiteboard](docs/whiteboard.jpg) |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (React)                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │   Code   │ │  TipTap  │ │ Whiteboard│ │   Slides /   │   │
│  │  Mirror  │ │  Editor  │ │  Canvas  │ │   Sheets     │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘   │
│       │             │            │               │           │
│       └─────────────┴─────┬──────┴───────────────┘           │
│                           ▼                                  │
│                    Yjs CRDT Doc                              │
│         ┌────────────────┴────────────────┐                  │
│         ▼                                 ▼                  │
│  ┌─────────────┐                  ┌─────────────┐            │
│  │ /yjs (WS)   │                  │ /rtc  (WS)  │            │
│  │  doc sync   │                  │ signaling + │            │
│  │             │                  │ team chat   │            │
│  └─────────────┘                  └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js + Express + ws                       │
│          (API + WebSocket relay + static serving)             │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
                    ┌─────────────┐
                    │  Neon (PG)  │
                    └─────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, CodeMirror 6, TipTap, Yjs, Lucide Icons |
| **Backend** | Node.js, Express 4, `ws` (WebSockets), JWT |
| **Database** | PostgreSQL (Neon serverless) |
| **Realtime** | y-websocket (CRDT sync) + custom `/rtc` relay (signaling + chat) |
| **Video** | WebRTC (STUN + free TURN relay) |
| **Deployment** | Docker, Render / Fly.io |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A PostgreSQL database (get a free one at [neon.tech](https://neon.tech))

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/NejamulHaque/collabsheets.git
cd collabsheets

# 2. Install backend dependencies
cd server
npm install
cp .env.example .env   # then fill in your DATABASE_URL + JWT_SECRET
cd ..

# 3. Install frontend dependencies
cd client
npm install
cd ..
```

### Environment Variables (`server/.env`)

```env
PORT=5001
DATABASE_URL=postgres://user:pass@host.neon.tech/dbname
JWT_SECRET=your-super-secret-random-string
STRIPE_SECRET_KEY=sk_test_...         # optional
STRIPE_WEBHOOK_SECRET=whsec_...       # optional
```

### Run Locally

**Terminal 1** — Backend:
```bash
cd server && npm run dev
```

**Terminal 2** — Frontend:
```bash
cd client && npm run dev
```

Open **http://localhost:5173** — register an account and start collaborating! 🎉

---

## 📁 Project Structure

```
collabsheets/
├── client/                      # React frontend (Vite)
│   ├── src/
│   │   ├── components/          # CallPanel, Whiteboard, AIPanel, etc.
│   │   ├── pages/               # Editor, Dashboard, Login, Profile
│   │   ├── store/               # Zustand (auth, theme)
│   │   ├── extensions/          # TipTap extensions
│   │   ├── config.js            # Env-aware API/WS URLs
│   │   └── App.jsx
│   └── public/sw.js             # Service worker (offline + caching)
│
├── server/                      # Node.js backend
│   ├── routes/                  # auth, documents, ai, chat, billing...
│   ├── yjsServer.js             # Yjs sync handler
│   ├── db.js                    # Postgres pool (UTC timestamp parser)
│   └── server.js                # Express + dual WebSocket server
│
├── Dockerfile                   # All-in-one production build
└── README.md
```

---

## 🌐 Deployment

### Option 1: Render (free, 5-min ping keeps it awake)

1. Push your repo to GitHub.
2. Render → **New → Web Service** → connect repo.
3. Add environment variables: `DATABASE_URL`, `JWT_SECRET`.
4. Deploy — Render auto-detects the `Dockerfile`.
5. Set up **UptimeRobot** to ping `https://your-app.onrender.com/health` every 5 min to prevent sleep.

### Option 2: Fly.io (never sleeps, free allowance)

```bash
fly auth login
fly launch                  # pick region, say No to Postgres
fly secrets set DATABASE_URL="..." JWT_SECRET="..."
fly deploy
fly open
```

---

## 🎮 Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + K` | Command Palette |
| `Ctrl + Enter` | Run code |
| `Ctrl + F` | Find & Replace |
| `Tab` | Accept autocomplete |
| Click gutter | Set breakpoint |

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add AmazingFeature'`
4. Push to the branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Yjs](https://yjs.dev/) for the amazing CRDT framework
- [CodeMirror 6](https://codemirror.net/) for the extensible editor
- [TipTap](https://tiptap.dev/) for the rich text foundation
- [Neon](https://neon.tech) for serverless Postgres
- [Lucide](https://lucide.dev/) for beautiful icons

---

<div align="center">

**Built with ❤️ by [Nejamul Haque](https://github.com/NejamulHaque)**

⭐ Star this repo if it helped you!

</div>
