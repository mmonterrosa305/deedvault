# DeedVault.io

Tax deed auction search & intelligence dashboard for Florida and Michigan.

## Stack
- **Next.js 14** (App Router)
- **Firebase Authentication**
- **Tailwind CSS**
- **TypeScript**
- Deploy to **Vercel**

---

## Setup (5 minutes)

### 1. Clone & install
```bash
git clone https://github.com/YOUR_USERNAME/deedvault.git
cd deedvault
npm install
```

### 2. Configure Firebase
1. Go to [Firebase Console](https://console.firebase.google.com) and open your project
2. Enable **Authentication → Sign-in method → Email/Password**
3. Go to **Project settings → Your apps** and copy the web app config values

### 3. Configure environment
```bash
cp .env.local.example .env.local
```
Edit `.env.local` with your Firebase config (all `NEXT_PUBLIC_FIREBASE_*` variables).

### 4. Create your first user
1. In Firebase Console go to **Authentication → Users**
2. Click **Add user** and set email + password

### 5. Run locally
```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel
```bash
npm i -g vercel
vercel
```
Add all `NEXT_PUBLIC_FIREBASE_*` env vars in the Vercel dashboard when prompted.

---

## Project structure
```
deedvault/
├── app/
│   ├── layout.tsx          # Root layout + fonts
│   ├── globals.css         # Design tokens + global styles
│   ├── page.tsx            # Root → redirects to /dashboard
│   ├── login/
│   │   └── page.tsx        # Login page
│   ├── dashboard/
│   │   ├── layout.tsx      # Auth check + nav wrapper
│   │   └── page.tsx        # Main search dashboard
│   └── api/auth/session/   # Session cookie (login/logout)
├── components/
│   └── DashboardNav.tsx    # Top nav with logout
├── lib/
│   ├── firebase.ts         # Firebase client
│   ├── auth-session.ts     # JWT verification
│   └── get-session.ts      # Server session helper
└── middleware.ts           # Route protection
```

---

## Next steps to build out
- [ ] Connect listings to Firestore
- [ ] Add county rules page (redemption periods, platforms per county)
- [ ] AI agent tab powered by Claude API
- [ ] Saved searches / watchlist per user
- [ ] Email alerts for new listings matching saved filters
- [ ] Map view (FL + MI choropleth by county)
