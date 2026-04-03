#!/usr/bin/env bash
# =============================================================================
# AgroConnect Ghana — Infrastructure Bootstrap
# Provisions: S3 state bucket → Terraform apply → EKS addons → ArgoCD bootstrap
# Usage: ./scripts/infra-bootstrap.sh [--env staging|production] [--dry-run]
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

ENV="production"
DRY_RUN=false
AWS_REGION="us-east-2"

for arg in "$@"; do
  case $arg in
    --env=*) ENV="${arg#*=}" ;;
    --dry-run) DRY_RUN=true ;;
    --region=*) AWS_REGION="${arg#*=}" ;;
  esac
done

CLUSTER_NAME="agroconnect-${ENV}"
STATE_BUCKET="agroconnect-terraform-state-${ENV}"
LOCK_TABLE="agroconnect-terraform-locks"

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}═══ $* ═══${NC}\n"; }
dryrun()  { $DRY_RUN && echo -e "${YELLOW}[DRY-RUN] $*${NC}" || eval "$*"; }

# ── Check prerequisites ───────────────────────────────────────────────────────
check_prereqs() {
  header "Prerequisites"
  for cmd in aws terraform kubectl helm; do
    command -v "$cmd" &>/dev/null && success "$cmd found" || error "$cmd not found"
  done

  log "Verifying AWS credentials..."
  ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  success "AWS Account: ${ACCOUNT_ID} | Region: ${AWS_REGION}"
}

# ── Bootstrap Terraform remote state ─────────────────────────────────────────
bootstrap_state() {
  header "Terraform Remote State"

  if aws s3api head-bucket --bucket "${STATE_BUCKET}" 2>/dev/null; then
    success "S3 bucket ${STATE_BUCKET} already exists"
  else
    log "Creating S3 state bucket: ${STATE_BUCKET}..."
    dryrun "aws s3api create-bucket \
      --bucket '${STATE_BUCKET}' \
      --region '${AWS_REGION}' \
      --create-bucket-configuration LocationConstraint='${AWS_REGION}'"

    dryrun "aws s3api put-bucket-versioning \
      --bucket '${STATE_BUCKET}' \
      --versioning-configuration Status=Enabled"

    dryrun "aws s3api put-bucket-encryption \
      --bucket '${STATE_BUCKET}' \
      --server-side-encryption-configuration '{
        \"Rules\": [{
          \"ApplyServerSideEncryptionByDefault\": {
            \"SSEAlgorithm\": \"aws:kms\"
          }
        }]
      }'"

    dryrun "aws s3api put-public-access-block \
      --bucket '${STATE_BUCKET}' \
      --public-access-block-configuration 'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'"

    success "S3 bucket created and hardened"
  fi

  if aws dynamodb describe-table --table-name "${LOCK_TABLE}" --region "${AWS_REGION}" 2>/dev/null; then
    success "DynamoDB lock table already exists"
  else
    log "Creating DynamoDB lock table: ${LOCK_TABLE}..."
    dryrun "aws dynamodb create-table \
      --table-name '${LOCK_TABLE}' \
      --attribute-definitions AttributeName=LockID,AttributeType=S \
      --key-schema AttributeName=LockID,KeyType=HASH \
      --billing-mode PAY_PER_REQUEST \
      --region '${AWS_REGION}'"
    success "DynamoDB lock table created"
  fi
}

# ── Terraform apply ───────────────────────────────────────────────────────────
run_terraform() {
  header "Terraform — ${ENV}"

  [ -z "${DB_PASSWORD:-}" ] && error "DB_PASSWORD env var not set"
  [ -z "${GITHUB_ORG:-}" ]  && error "GITHUB_ORG env var not set"
  [ -z "${GITHUB_REPO:-}" ] && error "GITHUB_REPO env var not set"

  cd "terraform/environments/${ENV}"

  log "Initialising Terraform..."
  dryrun "terraform init -input=false -reconfigure"

  log "Validating configuration..."
  dryrun "terraform validate"

  log "Planning..."
  dryrun "terraform plan \
    -var='db_password=${DB_PASSWORD}' \
    -var='github_org=${GITHUB_ORG}' \
    -var='github_repo=${GITHUB_REPO}' \
    -input=false \
    -out=tfplan"

  if ! $DRY_RUN; then
    echo ""
    warn "About to apply Terraform to ${ENV}. This will create real AWS resources."
    read -r -p "Type 'yes' to continue: " confirm
    [ "$confirm" = "yes" ] || error "Aborted"

    terraform apply -auto-approve -input=false tfplan
    success "Terraform apply complete"
  fi

  cd - > /dev/null
}

# ── Configure kubectl ─────────────────────────────────────────────────────────
configure_kubectl() {
  header "kubectl Configuration"
  log "Updating kubeconfig for cluster: ${CLUSTER_NAME}..."
  dryrun "aws eks update-kubeconfig \
    --name '${CLUSTER_NAME}' \
    --region '${AWS_REGION}' \
    --alias '${CLUSTER_NAME}'"
  success "kubeconfig updated"
}

# ── Install EKS add-ons ───────────────────────────────────────────────────────
install_addons() {
  header "EKS Add-ons"

  log "Installing AWS Load Balancer Controller..."
  dryrun "helm repo add eks https://aws.github.io/eks-charts --force-update"
  dryrun "helm upgrade --install aws-load-balancer-controller eks/aws-load-balancer-controller \
    --namespace kube-system \
    --set clusterName='${CLUSTER_NAME}' \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    --wait"
  success "AWS Load Balancer Controller installed"

  log "Installing External Secrets Operator..."
  dryrun "helm repo add external-secrets https://charts.external-secrets.io --force-update"
  dryrun "helm upgrade --install external-secrets external-secrets/external-secrets \
    --namespace external-secrets \
    --create-namespace \
    --wait"
  success "External Secrets Operator installed"

  log "Installing metrics-server..."
  dryrun "kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml"
  success "metrics-server installed"
}

# ── Bootstrap ArgoCD apps ─────────────────────────────────────────────────────
bootstrap_argocd() {
  header "ArgoCD Bootstrap"

  log "Waiting for ArgoCD to be ready..."
  dryrun "kubectl wait --for=condition=available deployment/argocd-server \
    -n argocd --timeout=300s"

  log "Applying root Application (app-of-apps)..."
  dryrun "kubectl apply -f k8s/argocd/applications.yaml"
  success "ArgoCD root application applied"

  log "Retrieving initial ArgoCD admin password..."
  if ! $DRY_RUN; then
    ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
      -o jsonpath="{.data.password}" | base64 -d)
    echo ""
    success "ArgoCD admin password: ${ARGOCD_PASSWORD}"
    warn "Change this password immediately after first login!"
  fi
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
  header "Bootstrap Complete 🎉"
  echo -e "${BOLD}Resources created:${NC}"
  echo -e "  ${GREEN}Cluster${NC}     → ${CLUSTER_NAME}"
  echo -e "  ${GREEN}Region${NC}      → ${AWS_REGION}"
  echo -e "  ${GREEN}State${NC}       → s3://${STATE_BUCKET}"
  echo -e ""
  echo -e "${BOLD}Next steps:${NC}"
  echo -e "  1. ${CYAN}kubectl get nodes${NC}  — verify nodes are Ready"
  echo -e "  2. ${CYAN}kubectl -n argocd get applications${NC}  — watch ArgoCD sync"
  echo -e "  3. Push a commit to trigger the CI/CD pipeline"
  echo -e ""
  echo -e "  ArgoCD UI: ${CYAN}kubectl port-forward svc/argocd-server -n argocd 8443:443${NC}"
  echo -e "  Grafana:   ${CYAN}kubectl port-forward svc/grafana -n monitoring 3000:80${NC}"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}${GREEN}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║  AgroConnect Infrastructure Bootstrap    ║"
  echo "  ║  Environment: ${ENV}                    "
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
  $DRY_RUN && warn "DRY-RUN MODE — no real changes will be made"

  check_prereqs
  bootstrap_state
  run_terraform
  configure_kubectl
  install_addons
  bootstrap_argocd
  print_summary
}

main "$@"
