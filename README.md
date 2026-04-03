# AgroConnect Ghana — AgriTech MVP

> Connecting Ghanaian farmers to buyers across the country.

---

## Project Structure

```
agritech/
├── src/                    # React frontend (Vite)
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Navbar.css
│   │   ├── ProduceCard.jsx
│   │   ├── ProduceCard.css
│   │   └── FormInput.jsx
│   ├── pages/
│   │   ├── Home.jsx / Home.css
│   │   ├── ListProduce.jsx
│   │   ├── FindProduce.jsx / FindProduce.css
│   │   ├── RequestProduce.jsx
│   │   └── FormPages.css
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   └── main.jsx
├── backend/
│   ├── server.js           # Express API
│   ├── package.json
│   └── .env.example
├── index.html
├── vite.config.js
└── package.json
```

---

## Setup

### 1. PostgreSQL Database

```sql
CREATE DATABASE agroconnect;
```

The tables (`produce`, `requests`) are auto-created when the server starts.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB credentials
npm run dev       # or: npm start
```

API runs at **http://localhost:4000**

### 3. Frontend

```bash
# From project root
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:4000
npm run dev
```

Frontend runs at **http://localhost:5173**

---

## API Endpoints

### POST `/produce` — List produce (farmer)
```json
{
  "farmer_name": "Kofi Mensah",
  "phone_number": "0244000000",
  "location": "Kumasi",
  "produce_type": "Tomatoes",
  "quantity": "20 Crates",
  "price": "180"        // optional
}
```

### GET `/produce` — Find produce (buyer)
Query params (all optional):
- `?location=Kumasi`
- `?produce_type=Maize`
- `?search=tomato`

### POST `/request` — Request produce (buyer)
```json
{
  "produce_needed": "Maize",
  "quantity": "100 bags",
  "location": "Accra",
  "phone_number": "0277000000",
  "notes": "White maize preferred"   // optional
}
```

### GET `/health`
Returns server status.

---

## Design System

- **Palette:** Forest green, warm amber, gold, terracotta, Ghana cream
- **Typography:** Playfair Display (headings) + DM Sans (body)
- **Pattern:** Kente cloth stripe accent on all key UI sections
- **Adinkra:** Geometric Adinkra-inspired SVG motifs used as decorative elements
- **Aesthetic:** Ghana earth + kente spirit — warm, trustworthy, rooted

---

# AgroConnect Ghana — DevSecOps EKS Platform

> **Akuafoɔ Ayekoo!** 🇬🇭 — Fully automated, security-conscious DevSecOps deployment of the AgroConnect Ghana 3-tier application on AWS EKS.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite → hardened nginx (non-root) |
| Backend | Node.js + Express + Prometheus metrics |
| Database | PostgreSQL 15 on RDS (Multi-AZ, KMS encrypted) |
| Registry | AWS ECR (immutable, scan-on-push, KMS) |
| Orchestration | AWS EKS 1.29 (Bottlerocket) |
| Node Autoscaling | Karpenter v0.33 (spot + on-demand, consolidation) |
| GitOps CD | ArgoCD v2.9 (app-of-apps, self-heal) |
| CI | GitHub Actions (OIDC — no static AWS credentials) |
| IaC | Terraform 1.6+ (modular, S3 remote state) |
| Monitoring | kube-prometheus-stack + custom Grafana dashboards |
| Secret Scan | Gitleaks |
| SAST | Semgrep + SonarCloud |
| SCA | Snyk + npm audit |
| Container CVE | Trivy (blocks CRITICAL/HIGH) |
| IaC Security | Checkov |
| Secrets Mgmt | AWS SSM + External Secrets Operator |

## Quick Start

```bash
# Local full DevSecOps pipeline
./scripts/local-dev.sh

# Bootstrap production infrastructure
./scripts/infra-bootstrap.sh --env production

# Run backend tests
cd backend && DATABASE_URL=postgresql://... npm test
```

## CI/CD Flow

```
git push → GitHub Actions (9 jobs)
  Gitleaks → Snyk → Semgrep → SonarCloud → Tests
  → Checkov → docker buildx → Trivy → kustomize update
       ↓
  ArgoCD detects manifest change → rolling deploy to EKS
       ↓
  Prometheus + Grafana dashboard + Alertmanager
```

## Security Highlights

- Zero static AWS credentials (GitHub OIDC)
- IRSA per workload (least-privilege)
- Default-deny NetworkPolicy
- Secrets via AWS SSM + External Secrets Operator
- IMDSv2 enforced on all nodes
- Immutable ECR image tags
- Node rotation every 30 days (Karpenter expireAfter)
- PodSecurityStandards: restricted
- readOnlyRootFilesystem on all containers

## Required GitHub Secrets

```
AWS_ACCOUNT_ID  AWS_ROLE_ARN  DB_PASSWORD
GITHUB_ORG=yormengh  GITHUB_REPO=agritech  SONAR_TOKEN
SNYK_TOKEN  SEMGREP_APP_TOKEN  VITE_API_URL  GIT_BOT_TOKEN
```

See **docs/runbook.md** for full operations guide and incident response procedures.
