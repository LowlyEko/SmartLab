# CAS SmartLab v1.0

Laboratory management system for the College of Arts and Sciences.

## Project Structure

```
SmartLab/          # Frontend (HTML/CSS/JS)
backend/           # Node.js + Express + Prisma API
student/           # Student-facing portal
```

## Setup

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm start
```

### Frontend
Open `SmartLab/dashboard.html` in a browser, or serve via Live Server.
Update `SmartLab/config.js` with your backend URL if not running locally.

## Database
- Import `CASLabInventory.sql` or `Dump20260517.sql` into MySQL
- Update `backend/.env` with your database credentials
