# AgroConnect Ghana — DevSecOps Runbook

> **Akuafoɔ Ayekoo!** 🇬🇭  
> This runbook covers day-to-day operations, incident response, and deployment procedures for the AgroConnect Ghana platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [First-Time Bootstrap](#first-time-bootstrap)
4. [Day-to-Day Operations](#day-to-day-operations)
5. [CI/CD Pipeline](#cicd-pipeline)
6. [Security Controls](#security-controls)
7. [Incident Response](#incident-response)
8. [Scaling & Cost Management](#scaling--cost-management)
9. [GitHub Secrets Reference](#github-secrets-reference)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          INTERNET                                         │
└─────────────────────────┬───────────────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │  AWS WAF    │  (L7 filtering, rate-limiting)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  ALB        │  (internet-facing, HTTPS only)
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
                    │  (isolated) │        │
                    └─────────────┘        │
                                           │
          Karpenter auto-provisions nodes ─┘
          across 3 AZs (spot + on-demand)

GitHub Actions CI  ─→  ECR  ─→  Kustomize manifest update
ArgoCD detects change  ─→  Syncs to EKS
Prometheus scrapes pods  ─→  Grafana dashboards + alerts
```

**Three tiers, three subnet layers:**
- **Public** — ALB only, no application workloads
- **Private** — EKS nodes (Karpenter managed)
- **Isolated** — RDS PostgreSQL, no internet route

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| terraform | >= 1.6 | `brew install terraform` |
| kubectl | >= 1.28 | `brew install kubectl` |
| helm | >= 3.13 | `brew install helm` |
| awscli | >= 2.13 | `brew install awscli` |
| kustomize | >= 5.3 | `brew install kustomize` |
| docker | >= 24 | Docker Desktop |
| argocd CLI | >= 2.9 | `brew install argocd` |
| trivy | latest | `brew install trivy` |
| gitleaks | latest | `brew install gitleaks` |
| semgrep | latest | `pip install semgrep` |

---

## First-Time Bootstrap

### 1. Configure AWS credentials

```bash
aws configure --profile agroconnect
export AWS_PROFILE=agroconnect
export AWS_REGION=us-east-2
```

### 2. Create Terraform state backend (one-time)

```bash
# Creates S3 bucket + DynamoDB table for state locking
aws s3 mb s3://agroconnect-terraform-state-prod --region us-east-2
aws s3api put-bucket-versioning \
  --bucket agroconnect-terraform-state-prod \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket agroconnect-terraform-state-prod \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws dynamodb create-table \
  --table-name agroconnect-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-2
```

### 3. Run the bootstrap script

```bash
chmod +x scripts/infra-bootstrap.sh
./scripts/infra-bootstrap.sh --env production
```

This will:
- Run `terraform init` + `plan` + `apply` for production
- Configure `kubectl` context
- Install Karpenter, ArgoCD, kube-prometheus-stack via Helm
- Bootstrap ArgoCD with the app-of-apps pattern
- Print access URLs

### 4. Configure GitHub repository secrets

See [GitHub Secrets Reference](#github-secrets-reference).

### 5. Push to `main` to trigger first deployment

```bash
git push origin main
# CI runs → images built → ECR push → kustomization.yaml updated → ArgoCD syncs
```

---

## Day-to-Day Operations

### Local development

```bash
# Full local DevSecOps pipeline (scans + tests + docker build + smoke tests)
./scripts/local-dev.sh

# Skip scans for rapid iteration
./scripts/local-dev.sh --skip-scans

# Just start the stack
./scripts/local-dev.sh --up

# Stop everything
docker-compose down -v
```

### Accessing services in-cluster

```bash
# ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8443:443
open https://localhost:8443
# Default password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d

# Grafana
kubectl port-forward svc/kube-prometheus-stack-grafana -n monitoring 3000:80
open http://localhost:3000  # admin / prom-operator

# Prometheus
kubectl port-forward svc/kube-prometheus-stack-prometheus -n monitoring 9090:9090
open http://localhost:9090
```

### Deploying a specific image tag (emergency)

```bash
cd k8s/overlays/production
kustomize edit set image \
  FRONTEND_IMAGE=794038236323.dkr.ecr.us-east-2.amazonaws.com/agroconnect-prod/frontend:sha-abc1234
kustomize edit set image \
  BACKEND_IMAGE=794038236323.dkr.ecr.us-east-2.amazonaws.com/agroconnect-prod/backend:sha-abc1234
git add . && git commit -m "hotfix: pin to sha-abc1234" && git push
# ArgoCD detects change and syncs within 3 minutes
```

### Rolling back a deployment

```bash
# Option A: ArgoCD rollback (keeps Git state clean)
argocd app rollback agroconnect-production

# Option B: Git revert (preferred — maintains GitOps audit trail)
git revert HEAD --no-edit
git push origin main
```

---

## CI/CD Pipeline

### GitHub Actions jobs (in order)

```
secret-scan       ← Gitleaks (blocks on detected secrets)
   │
dependency-audit  ← npm audit + Snyk (high/critical blocks)
   │
sast-semgrep      ← Semgrep SAST → SARIF → GitHub Security tab
   │
sonarcloud        ← SonarCloud quality gate
   │
test              ← npm test (backend API tests + Postgres service)
   │
iac-scan          ← Checkov (Terraform + K8s manifests)
   │
build             ← docker buildx → ECR push (with SBOM + provenance)
   │
trivy-scan        ← Container CVE scan (CRITICAL/HIGH blocks)
   │
update-manifests  ← kustomize edit set image → git push → ArgoCD sync
```

### Branch strategy

| Branch | Environment | Auto-deploy |
|--------|-------------|-------------|
| `main` | Production | ✅ on push |
| `develop` | Staging | ✅ on push |
| `feature/*` | None | CI only (no push) |
| `hotfix/*` | Production | ✅ on merge to main |

---

## Security Controls

### Layers of defence

| Layer | Control | Tool |
|-------|---------|------|
| Code | Secret detection | Gitleaks |
| Code | SAST | Semgrep, SonarCloud |
| Dependencies | SCA | Snyk, npm audit |
| IaC | Policy as code | Checkov |
| Container | CVE scan | Trivy |
| Container | Image signing | Docker provenance/SBOM |
| Runtime | Network isolation | NetworkPolicy (default deny) |
| Runtime | Pod security | PodSecurityStandards (restricted) |
| Runtime | Non-root containers | securityContext |
| Runtime | Read-only rootfs | readOnlyRootFilesystem: true |
| Runtime | No privilege escalation | allowPrivilegeEscalation: false |
| AWS | Least-privilege IAM | IRSA per workload |
| AWS | No static credentials | GitHub OIDC → AWS STS |
| AWS | Secrets management | AWS SSM + External Secrets Operator |
| AWS | Node rotation | Karpenter expireAfter: 720h |
| AWS | IMDSv2 enforced | httpTokens: required |
| AWS | Encrypted storage | KMS (EKS secrets, RDS, ECR, EBS) |
| AWS | Network flow logs | VPC Flow Logs → CloudWatch |

### Rotating secrets

```bash
# Rotate DB password
aws ssm put-parameter \
  --name "/agroconnect-prod/database/url" \
  --value "postgresql://agro_admin:NEW_PASSWORD@..." \
  --type SecureString \
  --overwrite

# External Secrets Operator syncs within refreshInterval (1h)
# Force immediate sync:
kubectl annotate externalsecret backend-secrets \
  -n agroconnect \
  force-sync=$(date +%s) --overwrite
```

---

## Incident Response

### Backend Down

```bash
# 1. Check pod status
kubectl get pods -n agroconnect -l app=backend

# 2. Check recent events
kubectl describe pod -n agroconnect -l app=backend | tail -40

# 3. Check logs
kubectl logs -n agroconnect -l app=backend --tail=100 --previous

# 4. Check DB connectivity
kubectl exec -n agroconnect deploy/backend -- \
  wget -qO- http://localhost:4000/ready

# 5. Force restart
kubectl rollout restart deploy/backend -n agroconnect

# 6. If persistent — rollback
argocd app rollback agroconnect-production
```

### High Error Rate

```bash
# Check error details in logs
kubectl logs -n agroconnect -l app=backend --tail=200 | grep '"status":5'

# Check Prometheus for spike timing
# kubectl port-forward ... then query:
# sum(rate(http_requests_total{status_code=~"5.."}[5m]))

# Scale up if load-related
kubectl scale deploy/backend -n agroconnect --replicas=5
```

### Karpenter Not Provisioning Nodes

```bash
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter --tail=100

# Check NodePool status
kubectl describe nodepool general

# Check for pending pods
kubectl get pods -A --field-selector=status.phase=Pending
```

### Database Connection Exhaustion

```bash
# Check current connections
kubectl exec -n agroconnect deploy/backend -- \
  node -e "const p=require('pg'); const pool=new p.Pool({connectionString:process.env.DATABASE_URL}); pool.query('SELECT count(*) FROM pg_stat_activity').then(r=>console.log(r.rows[0])).catch(console.error)"

# Restart backend pods to release idle connections
kubectl rollout restart deploy/backend -n agroconnect
```

---

## Scaling & Cost Management

### Manual scaling

```bash
# Scale frontend
kubectl scale deploy/frontend -n agroconnect --replicas=4

# Scale backend
kubectl scale deploy/backend -n agroconnect --replicas=6
```

### Karpenter cost optimisation

- **Spot instances** used by default for `spot-burst` NodePool (~70% cost saving)
- **Consolidation** enabled — nodes consolidated when underutilised after 30s
- **Node expiry** at 720h (30 days) — ensures OS security patches applied

### Staging cost saving (off-hours)

```bash
# Scale down staging at night (add to cron or CI schedule)
kubectl scale deploy/frontend deploy/backend \
  -n agroconnect-staging --replicas=0
```

---

## GitHub Secrets Reference

Set these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Where to get |
|--------|-------------|--------------|
| `AWS_794038236323` | 12-digit AWS account ID | AWS Console |
| `AWS_ROLE_ARN` | GitHub Actions IAM role ARN | Terraform output: `github_actions_role_arn` |
| `DB_PASSWORD` | RDS master password | Your choice (store in 1Password) |
| `GITHUB_ORG` | GitHub org name | Your org |
| `GITHUB_REPO` | Repository name | This repo |
| `SONAR_TOKEN` | SonarCloud token | sonarcloud.io → Account → Security |
| `SNYK_TOKEN` | Snyk API token | app.snyk.io → Account Settings |
| `SEMGREP_APP_TOKEN` | Semgrep token | semgrep.dev → Settings |
| `VITE_API_URL` | Backend API URL in production | `https://api.agroconnect.gh` |
| `GIT_BOT_TOKEN` | PAT for manifest commits | GitHub → Settings → Developer → PAT (repo scope) |
| `GITLEAKS_LICENSE` | Gitleaks license (optional) | gitleaks.io |

---

## Troubleshooting

### `terraform apply` fails with state lock

```bash
aws dynamodb delete-item \
  --table-name agroconnect-terraform-locks \
  --key '{"LockID": {"S": "agroconnect-terraform-state-prod/production/terraform.tfstate"}}'
```

### ArgoCD out-of-sync after force push

```bash
argocd app sync agroconnect-production --force
```

### ECR login expired in CI

The GitHub OIDC token is valid for 1 hour. If a job runs longer, re-authenticate:
```yaml
- uses: aws-actions/amazon-ecr-login@v2
```
This is already in the CI workflow; if it fails, check `AWS_ROLE_ARN` secret is set.

### Pod stuck in `Pending` — no nodes available

```bash
# Check Karpenter logs
kubectl logs -n karpenter deploy/karpenter --tail=50

# Describe the pending pod
kubectl describe pod <pod-name> -n agroconnect

# Common fix: NodePool limits reached — increase cpu/memory limits
kubectl edit nodepool general
```

### `kustomize build` fails locally

```bash
# Ensure kustomize version >= 5.3
kustomize version
# Validate overlay
kustomize build k8s/overlays/production --enable-helm
```
