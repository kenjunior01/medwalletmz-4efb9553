#!/usr/bin/env bash
# MedWallet MZ — build do APK (release)
#
# Uso:  chmod +x build.sh && ./build.sh
# Resultado: build/app/outputs/flutter-apk/app-release.apk
#
# Prioridade de configuração:
#   1. env.json na raiz de apps/mobile (recomendado — ver env.example.json)
#   2. variável de ambiente SUPABASE_ANON_KEY
#   3. argumento: ./build.sh ANON_KEY
#
# A URL de produção já é o default embutido na app (mesma base de dados
# da versão web) — só a anon key é preciso fornecer uma vez.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
URL="https://pfqruzusjjxyidhqkiob.supabase.co"

cd "$DIR"

flutter pub get

if [[ -f "$DIR/env.json" ]]; then
  echo "→ A usar env.json (mesma base de dados da versão web)"
  exec flutter build apk --release --dart-define-from-file="$DIR/env.json"
fi

KEY="${1:-${SUPABASE_ANON_KEY:-}}"
if [[ -z "$KEY" ]]; then
  echo "✗ Sem env.json nem anon key."
  echo "  Cria apps/mobile/env.json a partir de env.example.json (colando a tua anon key)"
  echo "  ou corre: ./build.sh ANON_KEY"
  exit 1
fi

echo "→ A usar anon key via --dart-define (URL default de produção)"
exec flutter build apk --release \
  --dart-define=SUPABASE_URL="$URL" \
  --dart-define=SUPABASE_ANON_KEY="$KEY"
