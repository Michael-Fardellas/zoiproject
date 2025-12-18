# Recipe Costing Web App

A simple web app for costing recipes and menu items.
Data is stored in the browser (localStorage). Use Export/Import JSON for backups or moving data.

## Run locally
1. Install Node.js 18+
2. In this folder:
   - npm install
   - npm run dev

## Build
- npm run build
Output will be in dist/

## Deploy to Netlify
Option A (drag and drop)
1. npm install
2. npm run build
3. Upload dist/ to Netlify

Option B (Git)
1. Push this project to GitHub
2. Netlify -> New site from Git
3. Build command: npm run build
4. Publish directory: dist

## Notes
- No server and no login.
- Data is per browser/device unless you export/import JSON.
