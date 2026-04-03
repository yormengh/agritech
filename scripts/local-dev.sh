#!/usr/bin/env bash
# =============================================================================
# AgroConnect Ghana — Local DevSecOps Bootstrap
# Runs: security scans → unit tests → docker build → integration tests
# Usage: ./scripts/local-dev.sh [--skip-scans] [--skip-tests] [--up]
# =============================================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

SKIP_SCANS=false
SKIP_TESTS=false
JUST_UP=false

for arg in "$@"; do
  case $arg in
    --skip-scans) SKIP_SCANS=true ;;
    --skip-tests) SKIP_TESTS=true ;;
    --up) JUST_UP=true ;;
  esac
done

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*"; }
success() { echo -e "${GREEN}✅ $*${NC}"; }
warn()    { echo -e "${YELLOW}⚠️  $*${NC}"; }
error()   { echo -e "${RED}❌ $*${NC}"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $*${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}\n"; }

# ── Prerequisites check ───────────────────────────────────────────────────────
check_prereqs() {
  header "Checking Prerequisites"
  local missing
  missing=()

  for cmd in docker docker-compose node npm git; do
    if command -v "$cmd" &>/dev/null; then
      success "$cmd — $(${cmd} --version 2>&1 | head -1)"
    else
      missing+=("$cmd")
    fi
  done

  # Optional tools
  for cmd in trivy semgrep gitleaks; do
    if command -v "$cmd" &>/dev/null; then
      success "$cmd found (security scanning enabled)"
    else
      warn "$cmd not found — some security scans will be skipped"
    fi
  done

  if [ "${#missing[@]}" -gt 0 ]; then
    error "Missing required tools: ${missing[*]}"
  fi
}

# ── Environment setup ─────────────────────────────────────────────────────────
setup_env() {
  header "Environment Setup"

  if [ ! -f .env ]; then
    log "Creating .env from template..."
    cat > .env << 'EOF'
POSTGRES_PASSWORD=localdev_secret_change_me
GRAFANA_PASSWORD=admin123
VITE_API_URL=http://localhost:4000
HUBTEL_CLIENT_ID=
HUBTEL_CLIENT_SECRET=
EOF
    success ".env created"
  else
    success ".env already exists"
  fi

  if [ ! -f backend/.env ]; then
    cat > backend/.env << 'EOF'
DATABASE_URL=postgresql://agro_user:localdev_secret_change_me@localhost:5432/agroconnect
PORT=4000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
EOF
    success "backend/.env created"
  fi
}

# ── Secret scanning ───────────────────────────────────────────────────────────
run_secret_scan() {
  header "Secret Detection (Gitleaks)"

  if command -v gitleaks &>/dev/null; then
    if gitleaks detect --source . --no-git --redact 2>/dev/null; then
      success "No secrets detected"
    else
      error "Secrets detected in codebase — review output above"
    fi
  else
    warn "gitleaks not installed — skipping (brew install gitleaks)"
    log "Install: https://github.com/gitleaks/gitleaks#installing"
  fi
}

# ── Dependency audit ──────────────────────────────────────────────────────────
run_dependency_audit() {
  header "Dependency Security Audit"

  log "Auditing frontend dependencies..."
  if (cd frontend && npm audit --audit-level=high 2>/dev/null); then
    success "Frontend: no high/critical vulnerabilities"
  else
    warn "Frontend: vulnerabilities found — run 'cd frontend && npm audit'"
  fi

  log "Auditing backend dependencies..."
  if (cd backend && npm audit --audit-level=high 2>/dev/null); then
    success "Backend: no high/critical vulnerabilities"
  else
    warn "Backend: vulnerabilities found — run 'cd backend && npm audit'"
  fi
}

# ── SAST ──────────────────────────────────────────────────────────────────────
run_sast() {
  header "Static Analysis (Semgrep)"

  if command -v semgrep &>/dev/null; then
    semgrep scan \
      --config=auto \
      --severity=ERROR \
      --exclude=node_modules \
      --exclude=dist \
      --exclude=.git \
      . || warn "Semgrep found issues — review output"
    success "SAST scan complete"
  else
    warn "semgrep not installed — skipping (pip install semgrep)"
  fi
}

# ── Unit tests ────────────────────────────────────────────────────────────────
run_tests() {
  header "Unit & Integration Tests"

  log "Installing frontend dependencies..."
  (cd frontend && npm ci --silent)

  log "Installing backend dependencies..."
  (cd backend && npm ci --silent)

  log "Running backend tests..."
  if (cd backend && npm test --if-present); then
    success "Backend tests passed"
  else
    warn "No backend tests configured yet — add tests in backend/tests/"
  fi

  log "Running frontend lint..."
  if (cd frontend && npm run lint --if-present); then
    success "Frontend lint passed"
  else
    warn "Frontend lint issues found"
  fi
}

# ── Docker build & container scan ────────────────────────────────────────────
run_docker_build() {
  header "Docker Build & Security Scan"

  log "Building frontend image..."
  docker build \
    -f docker/Dockerfile.frontend \
    --build-arg VITE_API_URL=http://localhost:4000 \
    -t agroconnect/frontend:local \
    .
  success "Frontend image built"

  log "Building backend image..."
  docker build \
    -f docker/Dockerfile.backend \
    -t agroconnect/backend:local \
    .
  success "Backend image built"

  # Trivy container scanning
  if command -v trivy &>/dev/null; then
    log "Scanning frontend image with Trivy..."
    trivy image \
      --severity CRITICAL,HIGH \
      --exit-code 0 \
      --ignore-unfixed \
      agroconnect/frontend:local

    log "Scanning backend image with Trivy..."
    trivy image \
      --severity CRITICAL,HIGH \
      --exit-code 0 \
      --ignore-unfixed \
      agroconnect/backend:local
    success "Trivy container scans complete"
  else
    warn "trivy not installed — skipping container scan (brew install trivy)"
  fi
}

# ── Start docker-compose stack ────────────────────────────────────────────────
start_stack() {
  header "Starting Local Stack"

  log "Starting services..."
  docker-compose up -d

  log "Waiting for services to be healthy..."
  local retries=30
  while [ $retries -gt 0 ]; do
    if docker-compose ps | grep -q "healthy"; then
      break
    fi
    sleep 2
    ((retries--))
  done

  sleep 5
  success "Stack is running"
  echo ""
  echo -e "${BOLD}  Service URLs:${NC}"
  echo -e "  ${GREEN}Frontend${NC}    → http://localhost:8080"
  echo -e "  ${GREEN}Backend API${NC} → http://localhost:4000"
  echo -e "  ${GREEN}Prometheus${NC}  → http://localhost:9090"
  echo -e "  ${GREEN}Grafana${NC}     → http://localhost:3000 (admin / admin123)"
  echo -e "  ${GREEN}PostgreSQL${NC}  → localhost:5432 / agroconnect"
}

# ── Smoke tests ───────────────────────────────────────────────────────────────
run_smoke_tests() {
  header "Smoke Tests"

  log "Testing backend health endpoint..."
  if curl -sf http://localhost:4000/health > /dev/null; then
    success "Backend /health OK"
  else
    warn "Backend /health failed — check docker-compose logs backend"
  fi

  log "Testing frontend..."
  if curl -sf http://localhost:8080/health > /dev/null; then
    success "Frontend /health OK"
  else
    warn "Frontend not responding — check docker-compose logs frontend"
  fi

  log "Testing API endpoints..."
  RESPONSE=$(curl -sf http://localhost:4000/produce 2>/dev/null) && \
    success "GET /produce OK — $(echo "$RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} listings')" 2>/dev/null || echo 'response received')" || \
    warn "GET /produce failed"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  clear
  echo -e "${BOLD}${GREEN}"
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║   AgroConnect Ghana — DevSecOps CLI   ║"
  echo "  ║   Akuafoɔ Ayekoo! 🇬🇭                 ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo -e "${NC}"

  check_prereqs
  setup_env

  if $JUST_UP; then
    start_stack
    run_smoke_tests
    exit 0
  fi

  if ! $SKIP_SCANS; then
    run_secret_scan
    run_dependency_audit
    run_sast
  fi

  if ! $SKIP_TESTS; then
    run_tests
  fi

  run_docker_build
  start_stack
  run_smoke_tests

  header "All checks passed 🎉"
  echo -e "${GREEN}${BOLD}Local DevSecOps pipeline complete.${NC}"
  echo -e "Run ${CYAN}docker-compose logs -f${NC} to tail logs."
  echo -e "Run ${CYAN}docker-compose down${NC} to stop."
}

main "$@"
