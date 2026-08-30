# ☕ CHAI ADDA (चाय का अड्डा) — Immersive Retro Music Experience

> **"Late nights. Old songs. One familiar tapri."**  
> An intimate, single-viewport retro Indian music web application streaming timeless golden Hindi classics within an atmospheric late-night chai stall environment.

---

## 🌟 Features & Highlights

- **🎧 Universal Hybrid Audio Engine**:
  - Native **HTML5 Audio API** for pristine, high-fidelity cloud MP3/AAC audio streaming directly from **Supabase Storage** and cloud CDNs.
  - **HTTP Range Requests (`206 Partial Content`)**: Instant microsecond seeking with zero buffering latency.
  - Secondary **YouTube IFrame Player** integration with cross-origin isolation.
  - Guaranteed `0:00` start time resets on track switching with volume fade controls.
- **🟢 Real-Time Presence & Listener Tracking**:
  - Powered by **Supabase Realtime WebSocket Channels**.
  - In-memory presence synchronization tracks live active listeners across the globe without database writes.
- **🔒 Zero-Trust Security (PostgreSQL & Supabase RLS)**:
  - Database-enforced **Row Level Security (RLS)** prevents unauthorized modifications.
  - Protected `admin_users` allowlist table with zero client API mutation policies.
- **🎨 Handcrafted Glassmorphism UI/UX**:
  - Built with pure **Vanilla CSS design tokens** and fluid clamp typography.
  - Fixed 16:9 cinematic framing (`100dvh`, no desktop scrollbar) highlighting the tapri scene.
  - Grand Devanagari display typography powered by Google Font **`Rozha One`**.
  - Floating glass music capsule with spinning vinyl artwork disc, soundwave equalizer, and slide-over playlist drawer.
  - Debounced hover-bridge volume popover and touch-friendly controls.
- **⚡ Full-Featured Admin Management Portal (`/admin`)**:
  - Secure song CRUD, active track limit enforcement (max 20), direct cloud storage URL linking, and external playlist synchronization.
  - Adaptive 2×2 mobile responsive layout.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, Vanilla CSS Design System |
| **Backend & Database** | PostgreSQL, Supabase (Auth, Database, Storage, Realtime) |
| **Security** | PostgreSQL Row Level Security (RLS), Zero-Trust Architecture |
| **Audio Engine** | Native HTML5 Audio API + YouTube IFrame API Hybrid |
| **Deployment** | Vercel (Global Edge Network, SPA Rewrites) / Netlify |

---

## 🚀 Quick Start & Local Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/YOUR_USERNAME/retro-chai.git
cd retro-chai
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 3. Initialize Database & RLS
Run the contents of [`supabase_schema.sql`](./supabase_schema.sql) in your **Supabase SQL Editor** to create the tables, RLS policies, and 20 curated retro classics.

### 4. Authorize Admin User
Insert your Supabase Auth User UUID into the allowlist:
```sql
INSERT INTO public.admin_users (user_id) 
VALUES ('YOUR_SUPABASE_USER_UUID');
```

### 5. Run the Dev Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🌐 Production Deployment

This project is pre-configured for 1-click deployment on **Vercel** with [`vercel.json`](./vercel.json) and **Netlify** with [`public/_redirects`](./public/_redirects).

1. Push your repository to GitHub.
2. Import the project on [Vercel](https://vercel.com) or [Netlify](https://netlify.com).
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the environment variables.
4. Update your **Redirect URLs** in Supabase Dashboard (**Authentication → URL Configuration**).

---

## 👨‍💻 Author & Credits

* **Curated & Crafted by**: [Subhajit Sahu](https://www.linkedin.com/in/subhajitsahu/)
* **Soundtrack**: Timeless Indian Retro Classics (1950s–1980s)
* **Background Environment**: Handcrafted Chai Tapri Illustration

---

*Enjoy your cup of chai and timeless music! ☕🎵*
