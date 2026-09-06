#!/usr/bin/env bash
# MedWallet MZ — script de execução rápida
# Uso:  ./run.sh                     → debug no dispositivo ligado
#       ./run.sh ANON_KEY            → debug com a tua chave Supabase
set -euo pipefail

URL="https://pfqruzusjjxyidhqkiob.supabase.co"
KEY="${1:-${SUPABASE_ANON_KEY:-SUBSTITUI_PELO_TEU_ANON_KEY}}"

flutter pub get
flutter run \
  --dart-define=SUPABASE_URL="$URL" \
  --dart-define=SUPABASE_ANON_KEY="$KEY"
