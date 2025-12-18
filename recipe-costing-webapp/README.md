# Recipe Costing Web App

A simple web app for costing recipes and menu items.
Data is stored in the browser (localStorage). Φόρτωσε ή επικόλλησε Excel (xlsx/csv) για υλικά ή έτοιμα πιάτα και εκτύπωσε PDF για τους υπολογισμούς.

## Run locally
1. Install Node.js 18+
2. In this folder:
   - npm install
   - npm run dev

## Excel import
- Χρησιμοποίησε το κουμπί "Κατέβασε πρότυπο Excel/CSV" για να δεις τη μορφή.
- Υποστηρίζονται δύο τύποι:
  - Υλικά: στήλες Όνομα, Μονάδα (g/ml/τεμ), Ποσότητα συσκευασίας, Κόστος συσκευασίας.
  - Πιάτα: στήλες Πιάτο, Υλικό, Ποσότητα, Μονάδα, Κόστος/μονάδα, Τιμή πώλησης (προαιρετική), Μερίδες (προαιρετικό).
  - Τα πιάτα δημιουργούνται με γραμμές υλικών, υπολογίζονται συνολικό κόστος και κόστος ανά μερίδα και μπορούν να σταλούν για εκτύπωση PDF.

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
- Τα δεδομένα αποθηκεύονται ανά συσκευή/φυλλομετρητή. Κράτα offline backup με το Excel ή PDF.
