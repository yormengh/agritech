#!/usr/bin/env bash
# =============================================================================
# AgroConnect Ghana — Infrastructure Teardown
# DESTRUCTIVE — removes all AWS resources for an environment
# Usage: ./scripts/teardown.sh --env staging
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'; BOLD='\033[1m'

ENV="${1:-}"
[ -z "$ENV" ] && { echo "Usage: $0 --env staging|production"; exit 1; }
ENV="${ENV#--env=}"

CLUSTER_NAME="agroconnect-${ENV}"
AWS_REGION="${AWS_REGION:-us-east-2}"

echo -e "${RED}${BOLD}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  ⚠️  DESTRUCTIVE OPERATION — TEARDOWN        ║"
echo "  ║  Environment: ${ENV}                         "
echo "  ║  Cluster:     ${CLUSTER_NAME}                "
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}This will PERMANENTLY DELETE all AWS resources for ${ENV}.${NC}"
echo -e "${YELLOW}Type the cluster name to confirm: ${BOLD}${CLUSTER_NAME}${NC}"
read -r confirm

[ "$confirm" != "$CLUSTER_NAME" ] && { echo "Aborted."; exit 1; }

echo -e "\n${RED}Proceeding with teardown in 5 seconds... (Ctrl+C to abort)${NC}"
sleep 5

# Remove ArgoCD apps first to prevent re-creation
echo "Removing ArgoCD applications..."
kubectl delete applications --all -n argocd --ignore-not-found=true 2>/dev/null || true

# Scale down workloads
echo "Scaling down workloads..."
kubectl delete namespace agroconnect agroconnect-staging --ignore-not-found=true 2>/dev/null || true

# Terraform destroy
echo "Running terraform destroy..."
cd "terraform/environments/${ENV}"
terraform init -input=false -reconfigure

terraform destroy \
  -var="db_password=${DB_PASSWORD:?DB_PASSWORD required}" \
  -var="github_org=${GITHUB_ORG:?GITHUB_ORG required}" \
  -var="github_repo=${GITHUB_REPO:?GITHUB_REPO required}" \
  -auto-approve \
  -input=false

echo -e "\n${GREEN}✅ Teardown complete for environment: ${ENV}${NC}"
