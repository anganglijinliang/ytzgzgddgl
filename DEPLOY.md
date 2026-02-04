# Deployment Guide for Angang Order System

## 1. Local Development

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
npm install
```

### Start Dev Server
```bash
npm run dev
```

## 2. Production Build

To verify the build locally:
```bash
npm run build
```
The output will be in the `dist` folder.

## 3. Deployment to Netlify

This project is configured for Netlify deployment.

### Option A: Via GitHub (Recommended)
1. Push this repository to GitHub.
2. Log in to Netlify and click "Add new site" > "Import an existing project".
3. Select GitHub and choose your repository `ytzgzgddgl`.
4. Netlify will detect the settings automatically:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Click "Deploy site".

### Option B: Via Netlify CLI (Manual)
1. Install Netlify CLI: `npm install -g netlify-cli`
2. Run `netlify deploy --prod`
3. Select `dist` as the publish directory.

## 4. Database Setup (Neon Postgres)

This system uses **Neon Serverless Postgres** for enterprise-grade data persistence.

### Configuration
1. Create a database in [Neon Console](https://console.neon.tech/).
2. Get the connection string (Connection Details -> .env).
3. Set the Environment Variable:
   - **Local**: Create `.env` file with `DATABASE_URL=postgres://...`
   - **Netlify**: Site Settings -> Environment variables -> Add `DATABASE_URL`.

### Initialization
1. Deploy the site or run locally (`netlify dev`).
2. Login as **Admin**.
3. Go to **Dashboard**.
4. Click the **"初始化数据库" (Initialize Database)** button.
   - This creates all necessary tables (`orders`, `production_records`, `shipping_records`).
   - *Note: You only need to do this once.*

## 5. Demo Features Usage

### Data Sync (Cloud Mode)
With the database connected, data sync is **automatic**. 
- Updates from Production team appear instantly for Sales/Admin.
- No manual JSON import/export needed (though still available as backup).

### Legacy Mode (Local Storage)
If the database is not connected, the system falls back to LocalStorage.
- Use **Export/Import Data** buttons on Dashboard to manually sync.

### MTC Generation
1. Go to **Order Tracking** (scan QR code or click from list).
2. If production is 100% complete, a **"Download MTC"** button will appear.
3. This generates a PDF compliant with **ISO 2531 / GB/T 13295**.
