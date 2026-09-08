export function PWAInstallPrompt() {
  // Browsers now own the install prompt. Intercepting beforeinstallprompt without
  // immediately calling prompt() produces a console warning and suppresses the
  // browser's native install UI, so this component intentionally renders nothing.
  return null;
}
