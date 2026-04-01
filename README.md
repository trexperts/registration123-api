# Registration123 — Backend API

Express + PostgreSQL + Nodemailer backend for Registration123.

## 📁 Structure

```
registration123-api/
├── package.json
├── .env.example         ← copy to .env and fill in
├── .gitignore
└── src/
    ├── index.js         ← Express server entry
    ├── db.js            ← PostgreSQL connection + table setup
    ├── email.js         ← Nodemailer email helpers
    └── routes/
        ├── registrations.js
        └── contact.js
```

---

## 🚀 Local Setup

### 1. Place the backend folder
Put `registration123-api` next to your frontend:
```
C:\Users\jmill\websites\
  ├── registration123\       ← frontend (Vite)
  └── registration123-api\   ← backend (Express)
```

### 2. Install dependencies
```bash
cd registration123-api
npm install
```

### 3. Set up environment variables
```bash
copy .env.example .env
```
Then open `.env` and fill in your values (see Gmail setup below).

### 4. Start the backend
```bash
npm run dev
```
API will run at `http://localhost:3001`

### 5. Update frontend API files
Replace these two files in your frontend project:
- `registration123/src/api/register.js` → use `FRONTEND-src-api-register.js`
- `registration123/src/api/contact.js`  → use `FRONTEND-src-api-contact.js`

### 6. Add frontend .env
In your `registration123` frontend folder, create a `.env` file:
```
VITE_API_URL=http://localhost:3001
```

---

## 📧 Gmail App Password Setup

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. **Security** → make sure **2-Step Verification** is ON
3. Search for **"App Passwords"** in the search bar
4. Create a new app password — name it "Registration123"
5. Copy the 16-character code into your `.env`:
```
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```
(spaces are fine, Gmail ignores them)

---

## 🚂 Deploy to Railway

### Step 1 — Create Railway account
Go to [railway.app](https://railway.app) and sign up with GitHub.

### Step 2 — Push backend to GitHub
```bash
cd registration123-api
git init
git add .
git commit -m "Initial backend"
```
Create a new repo on GitHub, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/registration123-api.git
git push -u origin main
```

### Step 3 — Create a new Railway project
- Click **New Project** → **Deploy from GitHub repo**
- Select your `registration123-api` repo
- Railway will auto-detect Node.js and deploy it

### Step 4 — Add PostgreSQL
- In your Railway project, click **+ New** → **Database** → **PostgreSQL**
- Railway automatically sets `DATABASE_URL` in your environment ✅

### Step 5 — Add environment variables
In Railway → your backend service → **Variables**, add:
```
GMAIL_USER=you@gmail.com
GMAIL_APP_PASSWORD=your-app-password
NOTIFY_EMAIL=you@gmail.com
FRONTEND_URL=https://yoursite.com
NODE_ENV=production
```
(Do NOT add DATABASE_URL — Railway sets that automatically)

### Step 6 — Get your Railway URL
Railway gives you a public URL like:
`https://registration123-api-production.up.railway.app`

### Step 7 — Update frontend for production
In your frontend `.env` (or hosting environment variables):
```
VITE_API_URL=https://registration123-api-production.up.railway.app
```

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/registrations` | Submit registration |
| GET | `/api/registrations` | View all registrations |
| POST | `/api/contact` | Submit contact form |
| GET | `/api/contact` | View all messages |

---

## 🧪 Test the API locally

Once running, test with:
```bash
curl -X POST http://localhost:3001/api/contact \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test\",\"email\":\"test@test.com\",\"subject\":\"sales\",\"message\":\"Hello!\"}"
```
