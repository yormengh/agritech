# AgroConnect Ghana — DevSecOps Architecture

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DEVELOPER WORKSTATION                                     │
│                                                                                   │
│  ./scripts/local-dev.sh                                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Gitleaks │→ │ npm audit│→ │ Semgrep  │→ │npm test  │→ │ Docker build +   │  │
│  │ (secrets)│  │  (deps)  │  │  (SAST)  │  │(API test)│  │ Trivy scan       │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘  │
└────────────────────────────┬────────────────────────────────────────────────────┘
                              │  git push
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        GITHUB ACTIONS (CI)                                       │
│                                                                                   │
│  ① Gitleaks ──────────────────────────────────── blocks on secrets              │
│  ② npm audit + Snyk ──────────────────────────── blocks on CRITICAL/HIGH deps   │
│  ③ Semgrep SAST ──────────────── SARIF ────────→ GitHub Security tab            │
│  ④ SonarCloud ────────────────── Quality Gate ──→ blocks on coverage/bugs       │
│  ⑤ Unit Tests ─────────────────── (Postgres svc) blocks on test failures        │
│  ⑥ Checkov (IaC) ──────────────── SARIF ────────→ GitHub Security tab           │
│  ⑦ docker buildx ──────────────── + SBOM ───────→ ECR (IMMUTABLE tags)         │
│  ⑧ Trivy (container CVE) ────────── SARIF ───────→ GitHub Security tab          │
│  ⑨ kustomize edit set image ─────────────────────→ git commit [skip ci]        │
└────────────────────────────┬────────────────────────────────────────────────────┘
                              │  manifest commit to k8s/overlays/
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        ARGOCD (CD)                                               │
│                                                                                   │
│  Watches:  k8s/overlays/production  (main branch)                                │
│            k8s/overlays/staging     (develop branch)                             │
│                                                                                   │
│  On change detected:                                                              │
│  kustomize build → diff → apply → health check → sync status                     │
│                                                                                   │
│  Self-heal: drift correction every 3 min                                          │
│  Prune:     removed resources cleaned up                                          │
└────────────────────────────┬────────────────────────────────────────────────────┘
                              │  kubectl apply
                              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        AWS EKS CLUSTER (us-east-2)                               │
│                                                                                   │
│  Namespace: agroconnect                                                           │
│  ┌─────────────────────┐   ┌─────────────────────┐                              │
│  │  frontend (nginx)   │   │  backend (node.js)  │                              │
│  │  HPA: 2-8 pods      │   │  HPA: 2-10 pods     │                              │
│  │  Non-root, RO-rootfs│   │  Non-root, RO-rootfs│                              │
│  │  PDB: minAvail=1    │   │  PDB: minAvail=1    │                              │
│  └──────────┬──────────┘   └──────────┬──────────┘                              │
│             │  NetworkPolicy: default deny + explicit allow                       │
│             └──────────────────────────┘                                         │
│                                                                                   │
│  Namespace: karpenter                                                             │
│  ┌─────────────────────────────────────────────────────────────┐                │
│  │  NodePool: general (spot+on-demand, c/m/r families)         │                │
│  │  NodePool: spot-burst (spot only)                            │                │
│  │  EC2NodeClass: Bottlerocket, IMDSv2, encrypted EBS           │                │
│  │  Consolidation: WhenUnderutilized, expiry: 720h              │                │
│  └─────────────────────────────────────────────────────────────┘                │
│                                                                                   │
│  Namespace: monitoring                                                            │
│  Prometheus → scrapes /metrics → evaluates PrometheusRules → Alertmanager        │
│  Grafana    → dashboards (HTTP metrics, pod resources, Karpenter, RDS)           │
└────────────────────────────┬────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────────┐
              ▼               ▼                   ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │  RDS PG 15   │  │  AWS SSM     │  │  AWS ECR     │
      │  Multi-AZ    │  │  (secrets)   │  │  (images)    │
      │  KMS encrypt │  │  KMS encrypt │  │  KMS encrypt │
      │  Isolated SN │  │              │  │  Scan-on-push│
      └──────────────┘  └──────────────┘  └──────────────┘
```

## VPC Network Layout

```
VPC: 10.0.0.0/16
│
├── PUBLIC SUBNETS (10.0.0.0/24, 10.0.1.0/24, 10.0.2.0/24)
│   └── ALB only — no application workloads
│
├── PRIVATE SUBNETS (10.0.10.0/24, 10.0.11.0/24, 10.0.12.0/24)
│   └── EKS nodes (Karpenter) — outbound via NAT GW
│
└── ISOLATED SUBNETS (10.0.20.0/24, 10.0.21.0/24, 10.0.22.0/24)
    └── RDS PostgreSQL — no internet route at all
```

## Security Layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1 — Code (pre-commit / CI)                   │
│  Gitleaks • Semgrep • SonarCloud • Snyk             │
├─────────────────────────────────────────────────────┤
│  LAYER 2 — Build (CI)                               │
│  Trivy CVE scan • Docker SBOM • Provenance          │
├─────────────────────────────────────────────────────┤
│  LAYER 3 — IaC (CI / Terraform plan)                │
│  Checkov • tfsec • No hardcoded secrets             │
├─────────────────────────────────────────────────────┤
│  LAYER 4 — Network (AWS + K8s)                      │
│  WAF • ALB HTTPS only • NetworkPolicy default-deny  │
├─────────────────────────────────────────────────────┤
│  LAYER 5 — Runtime (K8s)                            │
│  PodSecurityStandards(restricted)                   │
│  Non-root • ReadOnlyRootFilesystem • No privesc     │
│  seccompProfile: RuntimeDefault • Drop ALL caps     │
├─────────────────────────────────────────────────────┤
│  LAYER 6 — Identity (AWS)                           │
│  GitHub OIDC (no static creds) • IRSA per workload  │
│  Least-privilege IAM policies                       │
├─────────────────────────────────────────────────────┤
│  LAYER 7 — Secrets (AWS SSM + ESO)                  │
│  KMS-encrypted SSM params                           │
│  External Secrets Operator syncs to K8s Secret      │
├─────────────────────────────────────────────────────┤
│  LAYER 8 — Data (AWS)                               │
│  RDS KMS encryption at rest                         │
│  ECR KMS encryption • EBS encrypted volumes         │
│  VPC Flow Logs • CloudWatch Logs retention 30d      │
├─────────────────────────────────────────────────────┤
│  LAYER 9 — Observability                            │
│  Prometheus metrics • Grafana dashboards            │
│  PrometheusRules alerts → Alertmanager              │
│  → Slack (warning) / PagerDuty (critical)           │
└─────────────────────────────────────────────────────┘
```
