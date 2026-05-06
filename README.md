# Intelligent HR Recommendation System

> Enterprise HR platform for competence management, activity planning, and ML-powered employee recommendations — built as a final integration project at Esprit.

---

## Overview

This platform enables organizations to manage the full lifecycle of employee skill development:

- **Employees** declare and self-evaluate their competences, upload CVs, and receive activity invitations
- **Managers** validate skill sheets, grade employees, and review recommendation lists
- **HR teams** create training/certification activities and launch ML-powered recommendations
- **SuperAdmins** manage users, departments, and monitor the entire platform

The core innovation is a **Python ML service** that ranks employees for each activity based on skill scores and compatibility — with zero dependency on external AI APIs. Scores update automatically after activity completion using an exponential smoothing formula.

---

## Features

### Employee
- Self-evaluation competence sheet (levels 0–4: Notions → Expert)
- CV upload with automatic local NLP skill extraction (pdf-parse, no external API)
- Accept or decline activity invitations with justification
- Track participation status and skill score evolution
- Internal messaging and real-time notification feed
- Face recognition login

### Manager
- Review and grade employee skill sheets
- Approve or refuse employee recommendation lists per activity
- Exclude specific employees with a written justification
- View team-level skill analytics

### HR
- Create activities: `formation`, `certification`, `audit`, `projet`, `mission`
- Define required skills with minimum levels per activity
- Launch ML recommendation → ranked list of best-fit employees
- Manually adjust the list before sending to manager for validation
- Validate the final list → trigger employee invitations
- Analyze CV files to auto-populate skill profiles
- Dashboard insights and skill gap analytics

### SuperAdmin
- Full user management: create, edit, delete, assign roles
- Bulk user import via CSV
- Manage departments and assign department managers
- Complete audit log of all platform actions
- Platform-wide statistics

### Accessibility
- Floating accessibility widget (screen reader, contrast, font size, virtual keyboard, reading guide, and more)
- Skip-to-content link for keyboard users
- All features fully operable without a mouse

---

## Tech Stack

### Frontend

| Technology | Role |
|---|---|
| React 19 + Vite | SPA framework and dev server |
| React Router | Client-side routing with role-based guards |
| Axios | API communication |
| CSS Modules / custom CSS | Scoped component styles |
| face-api.js (WASM) | Client-side face recognition |

### Backend

| Technology | Role |
|---|---|
| NestJS (Node.js) | REST API framework |
| TypeScript | Type-safe backend code |
| MongoDB + Mongoose | Primary database |
| JWT (access + refresh) | Stateless authentication |
| GitHub OAuth | Social login |
| Multer | File uploads (CV, profile photo) |
| pdf-parse | Local PDF text extraction for CV analysis |
| Nodemailer | Email notifications (SMTP) |
| Passport.js | Auth strategy management |
| class-validator | Request DTO validation |

### ML Service (Python)

| Technology | Role |
|---|---|
| FastAPI | REST API framework |
| scikit-learn | TF-IDF vectorizer, GradientBoostingClassifier, cosine similarity |
| pandas / numpy | Data processing |
| scipy | Statistical utilities |
| joblib | Model persistence |
| Pydantic v2 | Request/response validation |

### DevOps

| Technology | Role |
|---|---|
| Docker | Containerization |
| Jenkins | CI/CD pipelines (frontend + backend + ML) |
| SonarQube | Code quality gate |
| Render | Cloud deployment |
| Kind | Local Kubernetes cluster |

---

## Architecture

```
┌──────────────────────┐          REST / JSON          ┌──────────────────────────┐
│    React + Vite      │ ◄──────────────────────────► │      NestJS Backend      │
│    Frontend :5173    │                               │      API :3000           │
└──────────────────────┘                               └────────────┬─────────────┘
                                                                    │
                                                        HTTP POST (internal)
                                                                    │
                                                       ┌────────────▼─────────────┐
                                                       │   Python ML Service      │
                                                       │   FastAPI :8000          │
                                                       │                          │
                                                       │  recommender.py          │
                                                       │  similarity.py (TF-IDF)  │
                                                       │  updater.py              │
                                                       │  trainer.py (GB model)   │
                                                       └──────────────────────────┘
```

**Graceful degradation:** if the Python ML service is unreachable, the NestJS backend automatically falls back to its built-in heuristic scorer — the frontend never sees a failure.

### ML Recommendation Flow

```
HR clicks "Run ML Recommendation"
        │
        ▼
NestJS fetches all validated employee competences
        │
        ▼
Calls Python /recommend endpoint
        │
        ▼
Python ranks employees:
  ├── TF-IDF skill name matching (char 2-4 grams)
  ├── Coverage ratio, level ratio, profile breadth
  ├── Context weights (upskilling / consolidation / expertise)
  └── GB model blend (if ≥ 20 feedback samples trained)
        │
        ▼
Returns ranked list → HR reviews → sends to Manager
        │
        ▼
Manager approves → invitations sent to employees
        │
        ▼
After activity completes → skill scores updated via
  exponential smoothing: Δ = α × max(0, target − current)
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- MongoDB (local or Atlas URI)

### 1. Backend

```bash
cd backend
cp .env.example .env      # configure MONGODB_URI, JWT_SECRET, MAIL_*, etc.
npm install
npm run start:dev
# → http://localhost:3000
```

### 2. ML Service

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
# → http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### 4. Docker (all at once)

```bash
docker compose up --build
```

### Backend `.env` reference

```env
MONGODB_URI=mongodb://localhost:27017/esprit-pi
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:5173
ML_SERVICE_URL=http://localhost:8000

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@email.com
MAIL_PASS=your_app_password

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

---

## Contributors

| Name | Role |
|---|---|
| Dhia Haddeji | Full-stack integration lead, ML service, CI/CD, DevOps |
| Haroun Ben Salem | Backend development & API design |
| Haider Adolfo Schenato | Frontend development & UI/UX |
| Abir Mosrati | Full-stack development & database design |

---

## Academic Context

**Institution:** Esprit School of Engineering, Tunis
**Program:** Engineering — 4th year, major TWIN (Technologies Web et Internet)
**Project type:** Projet d'Intégration (PI) — final-year capstone
**Academic year:** 2025–2026
**Class:** 4TWIN6

This project was developed as the final integration deliverable for the 4TWIN6 class, combining all modules studied throughout the year: web development, software architecture, DevOps, machine learning, and human-computer interaction.

---

## Acknowledgment

We would like to express our sincere gratitude to our project supervisor **Safe Saoud** for their invaluable guidance, continuous support, and constructive feedback throughout this project.

We also thank the open-source communities behind NestJS, React, FastAPI, and scikit-learn — this project would not be possible without their work.
