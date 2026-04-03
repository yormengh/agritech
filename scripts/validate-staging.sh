#!/usr/bin/env bash
# =============================================================================
# AgroConnect Ghana — Pre-Production Validation
# Runs comprehensive checks before promoting staging → production
# Usage: ./scripts/validate-staging.sh [--namespace agroconnect-staging]
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

NAMESPACE="${1:-agroconnect-staging}"
BASE_URL="${STAGING_URL:-https://staging.agroconnect.gh}"
PASS=0; FAIL=0; WARN_COUNT=0

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
pass()    { echo -e "${GREEN}  ✅ PASS${NC} — $*"; ((PASS++)); }
fail()    { echo -e "${RED}  ❌ FAIL${NC} — $*"; ((FAIL++)); }
warn()    { echo -e "${YELLOW}  ⚠️  WARN${NC} — $*"; ((WARN_COUNT++)); }
header()  { echo -e "\n${BOLD}${CYAN}── $* ──────────────────────────────${NC}"; }

# ── K8s Pod Health ────────────────────────────────────────────────────────────
check_pods() {
  header "Pod Health"

  TOTAL=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
  RUNNING=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
  FAILED=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase=Failed --no-headers 2>/dev/null | wc -l)

  [ "$FAILED" -eq 0 ] && pass "No failed pods ($RUNNING/$TOTAL running)" || fail "$FAILED pods in Failed state"

  # Check readiness
  NOT_READY=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep -v "Running\|Completed" | wc -l)
  [ "$NOT_READY" -eq 0 ] && pass "All pods in Running/Completed state" || fail "$NOT_READY pods not ready"

  # Crash loop detection
  CRASH=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | grep "CrashLoopBackOff" | wc -l)
  [ "$CRASH" -eq 0 ] && pass "No CrashLoopBackOff pods" || fail "$CRASH pods in CrashLoopBackOff"

  # Restart count
  HIGH_RESTARTS=$(kubectl get pods -n "$NAMESPACE" --no-headers 2>/dev/null | awk '{print $4}' | awk -F/ '{print $1}' | sort -n | tail -1)
  [ "${HIGH_RESTARTS:-0}" -lt 5 ] && pass "Pod restart count acceptable (max: ${HIGH_RESTARTS:-0})" || warn "High pod restart count: ${HIGH_RESTARTS}"
}

# ── Deployment rollout ────────────────────────────────────────────────────────
check_deployments() {
  header "Deployment Status"

  for deploy in frontend backend; do
    if kubectl get deployment "$deploy" -n "$NAMESPACE" &>/dev/null; then
      STATUS=$(kubectl rollout status deployment/"$deploy" -n "$NAMESPACE" --timeout=60s 2>&1)
      echo "$STATUS" | grep -q "successfully rolled out" && \
        pass "$deploy deployment rolled out successfully" || \
        fail "$deploy rollout not complete: $STATUS"

      # Desired vs available
      DESIRED=$(kubectl get deploy "$deploy" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
      AVAILABLE=$(kubectl get deploy "$deploy" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}')
      [ "${DESIRED}" = "${AVAILABLE}" ] && \
        pass "$deploy: $AVAILABLE/$DESIRED replicas available" || \
        fail "$deploy: only $AVAILABLE/$DESIRED replicas available"
    else
      warn "Deployment $deploy not found in $NAMESPACE"
    fi
  done
}

# ── API health checks ─────────────────────────────────────────────────────────
check_api() {
  header "API Health & Smoke Tests"

  # Health endpoint
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/health" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && pass "GET /health → $STATUS" || fail "GET /health → $STATUS (expected 200)"

  # GET /produce
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" "${BASE_URL}/api/produce" 2>/dev/null || echo "000")
  [ "$STATUS" = "200" ] && pass "GET /produce → $STATUS" || fail "GET /produce → $STATUS"

  # POST /produce (test payload)
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/produce" \
    -H "Content-Type: application/json" \
    -d '{"farmer_name":"Test Farmer","phone_number":"0244000000","location":"Accra","produce_type":"Maize","quantity":"1 bag"}' \
    2>/dev/null || echo "000")
  [ "$STATUS" = "201" ] && pass "POST /produce → $STATUS" || fail "POST /produce → $STATUS (expected 201)"

  # POST /request
  STATUS=$(curl -sf -o /dev/null -w "%{http_code}" \
    -X POST "${BASE_URL}/api/request" \
    -H "Content-Type: application/json" \
    -d '{"produce_needed":"Maize","quantity":"1 bag","location":"Accra","phone_number":"0244000001"}' \
    2>/dev/null || echo "000")
  [ "$STATUS" = "201" ] && pass "POST /request → $STATUS" || fail "POST /request → $STATUS (expected 201)"
}

# ── Security checks ───────────────────────────────────────────────────────────
check_security() {
  header "Security Checks"

  # Check no container running as root
  ROOT_CONTAINERS=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
root = [
  p['metadata']['name']
  for p in data['items']
  for c in p['spec']['containers']
  if not c.get('securityContext', {}).get('runAsNonRoot', False)
     and c.get('securityContext', {}).get('runAsUser', 0) == 0
]
print(len(root))
" 2>/dev/null || echo "0")
  [ "${ROOT_CONTAINERS:-0}" -eq 0 ] && pass "No containers running as root" || warn "$ROOT_CONTAINERS containers may run as root"

  # Check readOnlyRootFilesystem
  RW_FS=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
rw = sum(
  1 for p in data['items']
  for c in p['spec']['containers']
  if not c.get('securityContext', {}).get('readOnlyRootFilesystem', False)
)
print(rw)
" 2>/dev/null || echo "0")
  [ "${RW_FS:-0}" -eq 0 ] && pass "All containers have readOnlyRootFilesystem=true" || warn "$RW_FS containers have writable root filesystems"

  # Secrets not in plain env vars
  PLAIN_SECRETS=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
found = []
sensitive = ['password', 'secret', 'token', 'key', 'credential']
for p in data['items']:
  for c in p['spec']['containers']:
    for env in c.get('env', []):
      name_lower = env.get('name', '').lower()
      if any(s in name_lower for s in sensitive) and 'value' in env:
        found.append(env['name'])
print(len(found))
" 2>/dev/null || echo "0")
  [ "${PLAIN_SECRETS:-0}" -eq 0 ] && pass "No sensitive values in plain env vars" || fail "$PLAIN_SECRETS sensitive env vars exposed as plaintext"

  # Network policies exist
  NP_COUNT=$(kubectl get networkpolicies -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
  [ "${NP_COUNT}" -gt 0 ] && pass "$NP_COUNT NetworkPolicy objects found" || fail "No NetworkPolicies found — traffic is unrestricted"

  # Image tags not 'latest'
  LATEST_IMAGES=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
latest = sum(
  1 for p in data['items']
  for c in p['spec']['containers']
  if c['image'].endswith(':latest')
)
print(latest)
" 2>/dev/null || echo "0")
  [ "${LATEST_IMAGES:-0}" -eq 0 ] && pass "No containers using ':latest' image tag" || warn "$LATEST_IMAGES containers use ':latest' — use immutable sha tags in production"
}

# ── Resource limits ───────────────────────────────────────────────────────────
check_resources() {
  header "Resource Configuration"

  NO_LIMITS=$(kubectl get pods -n "$NAMESPACE" -o json 2>/dev/null | \
    python3 -c "
import sys, json
data = json.load(sys.stdin)
no_limits = sum(
  1 for p in data['items']
  for c in p['spec']['containers']
  if not c.get('resources', {}).get('limits')
)
print(no_limits)
" 2>/dev/null || echo "0")
  [ "${NO_LIMITS:-0}" -eq 0 ] && pass "All containers have resource limits" || fail "$NO_LIMITS containers missing resource limits"

  # HPA exists
  HPA_COUNT=$(kubectl get hpa -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
  [ "$HPA_COUNT" -gt 0 ] && pass "$HPA_COUNT HorizontalPodAutoscaler(s) configured" || warn "No HPA configured"

  # PDB exists
  PDB_COUNT=$(kubectl get pdb -n "$NAMESPACE" --no-headers 2>/dev/null | wc -l)
  [ "$PDB_COUNT" -gt 0 ] && pass "$PDB_COUNT PodDisruptionBudget(s) configured" || warn "No PDB configured — upgrades could cause downtime"
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
  header "Validation Summary"
  echo ""
  echo -e "  ${GREEN}PASSED:${NC}   $PASS"
  echo -e "  ${YELLOW}WARNINGS:${NC} $WARN_COUNT"
  echo -e "  ${RED}FAILED:${NC}   $FAIL"
  echo ""

  if [ "$FAIL" -gt 0 ]; then
    echo -e "${RED}${BOLD}❌ Staging validation FAILED — do NOT promote to production${NC}"
    exit 1
  elif [ "$WARN_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}${BOLD}⚠️  Staging passed with warnings — review before promoting${NC}"
    exit 0
  else
    echo -e "${GREEN}${BOLD}✅ All checks passed — ready to promote to production${NC}"
    exit 0
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}${CYAN}"
  echo "  ╔══════════════════════════════════════════════╗"
  echo "  ║  AgroConnect — Pre-Production Validation     ║"
  echo "  ║  Namespace: ${NAMESPACE}  "
  echo "  ╚══════════════════════════════════════════════╝"
  echo -e "${NC}"

  check_pods
  check_deployments
  check_api
  check_security
  check_resources
  print_summary
}

main "$@"
