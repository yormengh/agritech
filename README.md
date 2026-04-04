<div align="center">

# 🌱 AgroConnect Ghana

### *Connecting Farmers to Buyers Across Ghana*

[![CI](https://github.com/yormengh/agritech/actions/workflows/ci.yml/badge.svg)](https://github.com/yormengh/agritech/actions/workflows/ci.yml)
[![SonarCloud](https://sonarcloud.io/api/project_badges/measure?project=agroconnect-ghana&metric=alert_status)](https://sonarcloud.io/project/overview?id=agroconnect-ghana)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **"Onipa na ohia onipa"** — A person needs a person.
>
> AgroConnect Ghana bridges the gap between smallholder farmers and buyers across every region of Ghana — no middlemen, fair prices, direct connections.

---

**🇬🇭 Built for Ghana · Deployed on AWS EKS · Secured End-to-End**

</div>

---

## What is AgroConnect?

AgroConnect is a full-stack AgriTech marketplace platform that allows:

- **Farmers** to list their produce (type, quantity, price, location) in under 2 minutes
- **Buyers** to search and filter fresh produce from across Ghana's regions
- **Direct contact** via WhatsApp or phone call — zero commission, zero middlemen
- **SMS notifications** to matching farmers when a buyer submits a request (via Hubtel)

The platform is built with a Ghana-first design language — Kente cloth accents, Adinkra symbols, and a warm earth-tone palette that reflects the culture and spirit of Ghanaian agriculture.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  AWS WAF    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  ALB (HTTPS)│
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
   ┌──────▼─────┐  ┌───────▼──────┐        │
   │  Frontend  │  │   Backend    │        │
   │  (nginx)   │  │  (Node.js)   │        │
   │  2-8 pods  │  │  2-10 pods   │        │
   └────────────┘  └───────┬──────┘        │
                           │               │
                    ┌──────▼──────┐        │
                    │  RDS PG 15  │        │
                    │  Multi-AZ   │        │
                    └─────────────┘        │
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + React Router |
| Backend | Node.js + Express + PostgreSQL |
| Database | PostgreSQL 15 (RDS Multi-AZ, KMS encrypted) |
| Container Registry | AWS ECR (immutable tags, scan-on-push) |
| Orchestration | AWS EKS 1.29 (Bottlerocket nodes) |
| Node Autoscaling | Karpenter (spot + on-demand, auto-consolidation) |
| GitOps CD | ArgoCD (app-of-apps, self-healing) |
| CI/CD | GitHub Actions (OIDC — zero static AWS credentials) |
| Infrastructure | Terraform 1.6+ (modular, S3 remote state + DynamoDB locking) |
| Monitoring | Prometheus + Grafana + custom dashboards |
| SMS Notifications | Hubtel SMS API (Ghana) |
| Secret Scanning | Gitleaks |
| SAST | Semgrep + SonarCloud |
| SCA | Snyk + npm audit |
| Container CVE | Trivy |
| IaC Security | Checkov |
| Secrets Management | AWS SSM Parameter Store + External Secrets Operator |

---

## Project Structure

```
agritech/
├── frontend/                   # React + Vite app
│   ├── src/
│   │   ├── components/         # Navbar, ProduceCard, FormInput, Adinkra SVGs
│   │   ├── pages/              # Home, FindProduce, ListProduce, RequestProduce, About, Admin
│   │   └── styles/             # Global CSS + design tokens
│   └── Dockerfile → docker/Dockerfile.frontend
│
├── backend/                    # Node.js + Express API
│   ├── server.js               # Routes, DB, SMS, Prometheus metrics
│   └── tests/api.test.js       # Integration test suite
│
├── docker/                     # Docker configs
│   ├── Dockerfile.frontend     # Multi-stage: Vite build → hardened nginx
│   ├── Dockerfile.backend      # Multi-stage: deps → dumb-init runtime
│   ├── nginx.conf              # Security headers, gzip, CSP
│   └── default.conf            # SPA routing, health endpoint, asset caching
│
├── k8s/                        # Kubernetes manifests (Kustomize)
│   ├── base/                   # Base deployments, services, network policies
│   └── overlays/               # staging / production patches
│
├── terraform/                  # Infrastructure as Code
│   ├── environments/           # staging / production configs
│   └── modules/                # vpc, eks, rds, ecr, iam, karpenter
│
├── .github/workflows/          # CI/CD pipelines
│   ├── ci.yml                  # Main pipeline (9 jobs)
│   ├── security-audit.yml      # Scheduled security scans
│   └── terraform.yml           # Infrastructure pipeline
│
├── scripts/
│   ├── local-dev.sh            # Full local DevSecOps pipeline
│   └── infra-bootstrap.sh      # One-command AWS infrastructure bootstrap
│
└── docs/
    ├── architecture.md
    └── runbook.md              # Operations, incident response, scaling
```

---

## Getting Started Locally

### Prerequisites

- Node.js 20+, npm
- Docker + Docker Compose
- PostgreSQL (or use Docker Compose)

### Option A — Full Docker Stack (Recommended)

```bash
git clone https://github.com/yormengh/agritech.git
cd agritech

# Start everything: frontend, backend, postgres, prometheus, grafana
./scripts/local-dev.sh --skip-scans --skip-tests
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:4000 |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3000 |

### Option B — Manual Setup

```bash
# Backend
cd backend
cp .env.example .env   # fill in your DB credentials
npm install
npm run dev            # → http://localhost:4000

# Frontend (new terminal)
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:4000
npm install
npm run dev            # → http://localhost:5173
```

---

## API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | — |
| GET | `/metrics` | Prometheus metrics | — |
| POST | `/produce` | Farmer lists produce | — |
| GET | `/produce` | Browse listings (filterable) | — |
| PATCH | `/produce/:id` | Edit a listing | Admin |
| DELETE | `/produce/:id` | Remove a listing | Admin |
| PATCH | `/produce/:id/approve` | Approve a listing | Admin |
| POST | `/request` | Buyer submits request + SMS to farmers | — |
| GET | `/request` | List all buyer requests | Admin |
| POST | `/admin/login` | Get admin token | — |
| POST | `/admin/logout` | Invalidate token | Admin |

### Example: List Produce

```bash
curl -X POST http://localhost:4000/produce \
  -H "Content-Type: application/json" \
  -d '{
    "farmer_name": "Kofi Mensah",
    "phone_number": "0244000000",
    "location": "Kumasi",
    "produce_type": "Tomatoes",
    "quantity": "20 Crates",
    "price": "180"
  }'
```

---

## CI/CD Pipeline

Every `git push` to `main` or `develop` triggers a 9-job pipeline:

```
git push
    │
    ├── 1. Secret Detection (Gitleaks)
    ├── 2. Dependency Audit (Snyk + npm audit)
    ├── 3. SAST (Semgrep)
    ├── 4. SonarCloud Analysis
    ├── 5. Lint & Tests (backend integration tests)
    ├── 6. IaC Security (Checkov — Terraform + K8s)
    ├── 7. Build & Push Docker Images → ECR
    ├── 8. Container Vulnerability Scan (Trivy)
    └── 9. Update Kustomize manifests → ArgoCD auto-deploys
```

Zero static AWS credentials — GitHub Actions authenticates via OIDC.

---

## Infrastructure Bootstrap

```bash
# Set required env vars
export DB_PASSWORD="your-strong-password"
export GITHUB_ORG="yormengh"
export GITHUB_REPO="agritech"

# Dry run first
./scripts/infra-bootstrap.sh --env=staging --dry-run

# Real run (~15-20 mins)
./scripts/infra-bootstrap.sh --env=staging
```

This provisions: S3 state bucket → VPC → EKS → RDS → ECR → IAM (OIDC) → Karpenter → ArgoCD

---

## Security Highlights

- **Zero static credentials** — GitHub Actions uses AWS OIDC
- **IRSA per workload** — least-privilege IAM for every pod
- **Default-deny NetworkPolicy** — pods can only talk to what they need
- **Secrets via AWS SSM** + External Secrets Operator (never in Git)
- **IMDSv2 enforced** on all Karpenter nodes
- **Immutable ECR tags** — no image overwrites
- **KMS encryption** — EKS secrets, RDS, ECR all encrypted at rest
- **Non-root containers** — all pods run as UID 1001
- **Node rotation** every 30 days via Karpenter

---

## Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `AWS_ACCOUNT_ID` | 12-digit AWS account ID |
| `AWS_ROLE_ARN` | GitHub Actions IAM role (from Terraform output) |
| `DB_PASSWORD` | RDS master password |
| `POSTGRES_PASSWORD` | Local Docker Compose DB password |
| `GRAFANA_PASSWORD` | Grafana admin password |
| `SONAR_TOKEN` | SonarCloud analysis token |
| `SNYK_TOKEN` | Snyk vulnerability scanning token |
| `SEMGREP_APP_TOKEN` | Semgrep SAST token |
| `GIT_BOT_TOKEN` | PAT for manifest commits (repo scope) |
| `VITE_API_URL` | Production backend URL |

---

## Design System

AgroConnect uses a Ghana-first design language:

- **Palette** — Forest green, warm amber, gold, terracotta, Ghana cream
- **Typography** — Playfair Display (headings) + DM Sans (body)
- **Kente stripe** — Colourful horizontal accent on all key UI sections
- **Adinkra symbols** — Custom SVG components: Gye Nyame, Sankofa, Dwennimmen, Funtumfunefu
- **Ghana Black Star** — Used as the brand icon throughout

---

## Regions Served

Ashanti · Northern · Volta · Brong-Ahafo · Greater Accra · Upper East · Upper West · Central · Western · Eastern

---

## Contact

**AgroConnect Ghana**
📍 Tema, Greater Accra, Ghana
📞 +233 020 366 1818
💬 [WhatsApp](https://wa.me/233203661818)

Built with ❤️ for Ghanaian farmers — *Akuafoɔ Ayekoo!* 🇬🇭

---

<div align="center">

*"Yɛn ara yɛn asase ni" — This is our own land.*

</div>
