#!/usr/bin/env bash
# =============================================================================
# build-android.sh — Script para gerar APK/AAB do MedWallet
#
# Pré-requisitos:
#   1. Node.js + npm instalados
#   2. Android Studio + Android SDK (Build Tools, Platform Tools)
#   3. JAVA_HOME apontando para JDK 17+
#   4. Variável ANDROID_HOME ou ANDROID_SDK_ROOT configurada
#
# Uso:
#   ./scripts/build-android.sh apk      # Gera APK debug para testar
#   ./scripts/build-android.sh release  # Gera AAB release para Play Store
#   ./scripts/build-android.sh both     # Gera ambos
# =============================================================================

set -e  # Sai em caso de erro

# ── Configurações ────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

OUTPUT_DIR="$ROOT_DIR/android/app/build/outputs"
APK_DEBUG="$OUTPUT_DIR/apk/debug/app-debug.apk"
AAB_RELEASE="$OUTPUT_DIR/bundle/release/app-release.aab"
APK_RELEASE="$OUTPUT_DIR/apk/release/app-release.apk"

# ── Cores para output ────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log()  { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
ok()   { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERRO]${NC} $1"; }

# ── Verificar pré-requisitos ────────────────────────────────────────────────
check_prereqs() {
  log "A verificar pré-requisitos..."

  command -v node >/dev/null 2>&1 || { err "Node.js não encontrado. Instala de https://nodejs.org/"; exit 1; }
  command -v npx >/dev/null 2>&1  || { err "npx não encontrado. Reinstala Node.js."; exit 1; }

  # Verificar Android SDK
  if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
    err "ANDROID_HOME não definido. Configura com:"
    echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
    echo "  export PATH=\$PATH:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/cmdline-tools/latest/bin"
    exit 1
  fi

  # Verificar JAVA_HOME
  if [ -z "$JAVA_HOME" ]; then
    warn "JAVA_HOME não definido. A usar java do PATH..."
  fi

  ok "Pré-requisitos OK"
}

# ── Build web (vite build) ──────────────────────────────────────────────────
build_web() {
  log "A instalar dependências..."
  npm install --legacy-peer-deps

  log "A fazer build da web (vite build)..."
  npm run build

  if [ ! -d "$ROOT_DIR/dist" ]; then
    err "Build web falhou — dist/ não encontrado"
    exit 1
  fi
  ok "Build web completa (dist/)"
}

# ── Sync Capacitor ──────────────────────────────────────────────────────────
sync_capacitor() {
  log "A sincronizar Capacitor (copia dist/ para android/)..."
  npx cap sync android
  ok "Capacitor sincronizado"
}

# ── Build APK debug ─────────────────────────────────────────────────────────
build_apk_debug() {
  log "A gerar APK debug..."

  cd "$ROOT_DIR/android"
  ./gradlew assembleDebug

  if [ -f "$APK_DEBUG" ]; then
    ok "APK debug gerado: $APK_DEBUG"
    # Copiar para download fácil
    cp "$APK_DEBUG" "$ROOT_DIR/medwallet-debug.apk"
    ok "Copiado para: $ROOT_DIR/medwallet-debug.apk"
  else
    err "APK debug não encontrado em $APK_DEBUG"
    exit 1
  fi
  cd "$ROOT_DIR"
}

# ── Build AAB release (para Play Store) ─────────────────────────────────────
build_aab_release() {
  log "A gerar AAB release (para Play Store)..."

  # Verificar keystore
  if [ ! -f "$ROOT_DIR/android/keystore.properties" ]; then
    err "keystore.properties não encontrado em android/keystore.properties"
    echo ""
    echo "Para criar o keystore (apenas UMA VEZ — guardar com segurança!):"
    echo ""
    echo "  cd android/app"
    echo "  keytool -genkeypair -v \\"
    echo "    -keystore medwallet-release.keystore \\"
    echo "    -alias medwallet \\"
    echo "    -keyalg RSA -keysize 2048 \\"
    echo "    -validity 10000"
    echo ""
    echo "Depois cria android/keystore.properties com:"
    echo "  storeFile=medwallet-release.keystore"
    echo "  storePassword=<a tua password>"
    echo "  keyAlias=medwallet"
    echo "  keyPassword=<a tua password>"
    echo ""
    exit 1
  fi

  cd "$ROOT_DIR/android"
  ./gradlew bundleRelease

  if [ -f "$AAB_RELEASE" ]; then
    ok "AAB release gerado: $AAB_RELEASE"
    # Copiar para raiz para download fácil
    cp "$AAB_RELEASE" "$ROOT_DIR/medwallet-release.aab"
    ok "Copiado para: $ROOT_DIR/medwallet-release.aab"
  else
    err "AAB release não encontrado em $AAB_RELEASE"
    exit 1
  fi

  # Também gerar APK release universal (para distribuição directa)
  log "A gerar APK release universal..."
  ./gradlew assembleRelease
  if [ -f "$APK_RELEASE" ]; then
    cp "$APK_RELEASE" "$ROOT_DIR/medwallet-release.apk"
    ok "APK release: $ROOT_DIR/medwallet-release.apk"
  fi

  cd "$ROOT_DIR"
}

# ── Limpar builds anteriores ────────────────────────────────────────────────
clean() {
  log "A limpar builds anteriores..."
  cd "$ROOT_DIR/android"
  ./gradlew clean
  cd "$ROOT_DIR"
  rm -rf dist/
  ok "Limpeza concluída"
}

# ── Menu principal ──────────────────────────────────────────────────────────
main() {
  local cmd="${1:-help}"

  echo ""
  echo "=========================================="
  echo "  MedWallet — Build Android"
  echo "=========================================="
  echo ""

  case "$cmd" in
    apk|debug)
      check_prereqs
      build_web
      sync_capacitor
      build_apk_debug
      echo ""
      ok "Build APK debug completo!"
      echo ""
      echo "Para instalar no telemóvel (com USB debugging activo):"
      echo "  adb install medwallet-debug.apk"
      ;;
    release|aab)
      check_prereqs
      build_web
      sync_capacitor
      build_aab_release
      echo ""
      ok "Build release completo!"
      echo ""
      echo "Para fazer upload à Google Play Store:"
      echo "  1. Aceder a https://play.google.com/console"
      echo "  2. Criar nova app ou seleccionar MedWallet"
      echo "  3. Production → Create new release"
      echo "  4. Upload medwallet-release.aab"
      ;;
    both)
      check_prereqs
      build_web
      sync_capacitor
      build_apk_debug
      build_aab_release
      ;;
    clean)
      clean
      ;;
    help|*)
      echo "Uso: $0 <comando>"
      echo ""
      echo "Comandos:"
      echo "  apk       Gera APK debug (para testar no telemóvel)"
      echo "  release   Gera AAB release (para upload à Play Store)"
      echo "  both      Gera ambos"
      echo "  clean     Limpa builds anteriores"
      ;;
  esac
  echo ""
}

main "$@"
