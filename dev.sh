#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEBUG_LOG="$ROOT/debug-a4d11a.log"
BACKEND_PID=""
FRONTEND_PID=""

debug_log() {
  local hypothesis_id="$1"
  local message="$2"
  local data="$3"
  # #region agent log
  printf '{"sessionId":"a4d11a","hypothesisId":"%s","location":"dev.sh","message":"%s","data":%s,"timestamp":%s}\n' \
    "$hypothesis_id" "$message" "$data" "$(date +%s000)" >> "$DEBUG_LOG"
  # #endregion
}

cleanup() {
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
}

wait_for_backend() {
  local max_seconds=90
  local attempt=0

  debug_log "H2" "waiting for backend on :3000" "{\"maxSeconds\":$max_seconds}"

  while [[ $attempt -lt $max_seconds ]]; do
    if curl -sf "http://localhost:3000/api" >/dev/null 2>&1; then
      debug_log "H2" "backend ready" "{\"attempts\":$attempt,\"seconds\":$attempt}"
      echo "Backend is ready on http://localhost:3000"
      return 0
    fi

    if [[ -n "$BACKEND_PID" ]] && ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      debug_log "H5" "backend process exited before ready" "{\"attempts\":$attempt}"
      echo "Backend process exited before it became ready. Check backend logs."
      return 1
    fi

    sleep 1
    attempt=$((attempt + 1))
  done

  debug_log "H5" "backend wait timed out" "{\"attempts\":$attempt}"
  echo "Backend did not respond on http://localhost:3000 within ${max_seconds}s."
  return 1
}

trap cleanup EXIT INT TERM

echo "Starting backend (http://localhost:3000)..."
debug_log "H2" "starting backend" "{\"command\":\"npm run start:dev\"}"
(
  cd "$ROOT/backend"
  npm run start:dev
) &
BACKEND_PID=$!

if ! wait_for_backend; then
  exit 1
fi

echo "Starting frontend (http://localhost:5173)..."
debug_log "H2" "starting frontend after backend ready" "{}"
(
  cd "$ROOT/frontend"
  npm run dev
) &
FRONTEND_PID=$!

echo "Press Ctrl+C to stop both servers."
wait "$BACKEND_PID" "$FRONTEND_PID"
