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

## 4. Demo Features Usage

### Data Sync (Serverless Mode)
Since this is a client-side demo (using LocalStorage), data is isolated per browser. To sync data between different roles (e.g., Admin -> Production -> Shipping):

1. **Login as Admin** (`admin`).
2. Go to **Dashboard**.
3. Click **Export Data** to download `angang_backup_xxxx.json`.
4. Send this file to other users (or open in another browser).
5. Log in as another user (e.g., `prod`).
6. Go to **Dashboard** (Admin only feature currently, you may need to temporarily login as admin to import, or we can enable it for all).
   * *Note: Currently Import/Export is Admin only.*
7. Click **Import Data** and select the JSON file.

### MTC Generation
1. Go to **Order Tracking** (scan QR code or click from list).
2. If production is 100% complete, a **"Download MTC"** button will appear.
3. This generates a PDF compliant with **ISO 2531 / GB/T 13295**.
