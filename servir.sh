#!/usr/bin/env bash
# Inicia um servidor local para testar o site (macOS / Linux).
set -e
cd "$(dirname "$0")"

PORTA="${1:-8000}"

echo
echo "  Pasta servida : $(pwd)"
echo "  Endereco      : http://localhost:${PORTA}/"
echo
echo "  Para parar o servidor, pressione Ctrl+C."
echo

(sleep 1; (command -v xdg-open >/dev/null && xdg-open "http://localhost:${PORTA}/" || open "http://localhost:${PORTA}/") >/dev/null 2>&1) &

exec python3 -m http.server "${PORTA}"
