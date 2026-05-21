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

.env
DATABASE\_URL="mysql://root:praxis@localhost:3306/smartlab\_schema"

JWT\_SECRET="your\_super\_secret\_jwt\_key\_123!"

PORT=5000

GOOGLE\_CLIENT\_ID="596806363130-117mkd7fdb0b35cnr42iipuo08b8ccck.apps.googleusercontent.com"

GOOGLE\_CLIENT\_SECRET="your\_google\_client\_secret\_here"


## Database

* Import `CASLabInventory.sql` or `Dump20260517.sql` into MySQL
* Update `backend/.env` with your database credentials

