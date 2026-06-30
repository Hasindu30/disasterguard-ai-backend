# 🛡️ DisasterGuard AI — Backend

Express.js + TypeScript REST API for the DisasterGuard AI early warning system. **Deployed on Vercel as a serverless function.**

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js + TypeScript |
| Framework | Express.js |
| Deployment | Vercel (Serverless) |
| Database | MongoDB Atlas (Mongoose) |
| Auth | JWT (JSON Web Tokens) + bcrypt |
| Email | Nodemailer (SMTP) |
| Weather | Open-Meteo API (free, no key needed) |

## 📁 Project Structure

```
backend/
├── src/
│   ├── middleware/
│   │   └── auth.ts          # JWT protect + admin middleware
│   ├── models/
│   │   ├── User.ts          # User schema (name, email, password, role)
│   │   ├── RiskReport.ts    # Disaster risk assessment reports
│   │   └── Alert.ts         # Auto-generated alerts
│   ├── routes/
│   │   ├── authRoutes.ts    # Login, register, password reset
│   │   ├── riskRoutes.ts    # Risk calculation + history
│   │   └── alertRoutes.ts   # Alert management
│   ├── types/
│   │   └── index.ts         # TypeScript interfaces
│   └── server.ts            # Express app entry point
├── .env.example             # Environment variable template
├── package.json
└── tsconfig.json
```

## ⚙️ Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/disasterguard-backend.git
cd disasterguard-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
```bash
cp .env.example .env
```
Then edit `.env` with your values:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/disasterguard
JWT_SECRET=your_very_strong_random_secret_key
```

### 4. Run in development mode
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
npm start
```

## 🔐 API Endpoints

### Auth (`/api/auth`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/register` | Create a new user account | Public |
| POST | `/login` | Login and receive JWT token | Public |
| GET | `/me` | Get current logged-in user | 🔒 Protected |
| POST | `/forgot-password/request` | Generate + send temp password | Public |
| POST | `/forgot-password/verify` | Verify temp password | Public |
| POST | `/forgot-password/reset` | Set new password | Public |

### Risk Assessment (`/api/risk`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/calculate` | Run disaster risk score for a location | 🔒 Protected |
| GET | `/history` | Get current user's risk report history | 🔒 Protected |
| GET | `/all` | Get all reports (admin only) | 🔒 Admin |

### Alerts (`/api/alerts`)
| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/` | Get all alerts for current user | 🔒 Protected |
| GET | `/all` | Get all alerts (admin only) | 🔒 Admin |

## 🌦️ Risk Score Formula

```
Risk Score = (Rainfall × 0.4) + (Wind Speed × 0.2) + (Flood History × 10 × 0.25) + (Low Elevation × 10 × 0.15)
```

| Score | Risk Level |
|-------|-----------|
| 0 – 39 | 🟢 Low Risk |
| 40 – 69 | 🟡 Medium Risk |
| 70 – 100 | 🔴 High Risk |

## 📦 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default: 5000) |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `SMTP_HOST` | Optional | SMTP server for email (e.g. smtp.gmail.com) |
| `SMTP_PORT` | Optional | SMTP port (587 for TLS) |
| `SMTP_USER` | Optional | SMTP sender email address |
| `SMTP_PASS` | Optional | SMTP password / Gmail App Password |

> **Note:** If SMTP is not configured, temporary passwords are logged to the console as fallback. The frontend uses EmailJS for email delivery by default.

## 🔗 Related Repository

- **Frontend:** [disasterguard-frontend](https://github.com/YOUR_USERNAME/disasterguard-frontend)

## 📄 License
MIT
