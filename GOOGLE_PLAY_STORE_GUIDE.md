# 📱 MedWallet — Guia Completo: Versão Mobile + Google Play Store

Este guia explica como a versão mobile do MedWallet está configurada, como gerar o APK/AAB e como fazer upload à Google Play Store.

---

## 🎯 Arquitetura — Como a app fica "sincronizada com a web"

A versão Android do MedWallet usa uma **arquitetura híbrida** com Capacitor:

```
┌─────────────────────────────────────────────────────────────────┐
│                    APK Android (MedWallet.app)                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  WebView Android (Chrome System)                        │   │
│  │                                                          │   │
│  │  Carrega: https://medwalletmz.online/                   │   │
│  │  ↑↑↑ MESMO conteúdo da web — sempre sincronizado ↑↑↑    │   │
│  │                                                          │   │
│  │  - Service Worker faz cache offline                     │   │
│  │  - Push notifications via Firebase Cloud Messaging      │   │
│  │  - Câmera, geolocalização via plugins Capacitor         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Vantagens desta abordagem:**

1. ✅ **Sempre sincronizada** — qualquer deploy na web reflecte-se na app sem rebuild
2. ✅ **Atualizações instantâneas** — sem passar pela revisão da Play Store
3. ✅ **Código único** — não precisas de manter duas versões
4. ✅ **Offline-first** — Service Worker faz cache das páginas visitadas
5. ✅ **Acesso a hardware nativo** — câmera, GPS, push notifications

**Quando fazer rebuild do APK:**

- Mudar permissões Android (`AndroidManifest.xml`)
- Mudar ícone da app ou splash screen
- Mudar `appId` (NUNCA depois de publicado na Play Store)
- Mudar versão (`versionCode`/`versionName`) — necessário para cada upload

---

## 📋 Pré-requisitos

### 1. Ambiente de desenvolvimento

Para gerar o APK/AAB precisa de:

| Requisito | Versão | Como verificar |
|-----------|--------|----------------|
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Android Studio | Hedgehog+ | [Download](https://developer.android.com/studio) |
| Android SDK | API 34+ | Via Android Studio SDK Manager |
| JDK | 17+ | `java -version` |
| Capacitor CLI | 7+ | `npx cap --version` |

### 2. Variáveis de ambiente

Adicionar ao `~/.bashrc` ou `~/.zshrc`:

```bash
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64  # ajustar conforme instalação
```

Depois: `source ~/.bashrc`

---

## 🔨 Como gerar o APK (para testar no telemóvel)

### Método 1: Script automático

```bash
cd medwallet
./scripts/build-android.sh apk
```

Este script:
1. Instala dependências npm
2. Faz build da web (`vite build`)
3. Sincroniza Capacitor (`npx cap sync android`)
4. Compila APK debug
5. Copia para `medwallet-debug.apk`

### Método 2: Passo a passo manual

```bash
# 1. Build da web
npm install --legacy-peer-deps
npm run build

# 2. Sincronizar Capacitor
npx cap sync android

# 3. Compilar APK debug
cd android
./gradlew assembleDebug

# 4. APK gerado em:
#    android/app/build/outputs/apk/debug/app-debug.apk
```

### Instalar no telemóvel

1. Activar **Depuração USB** em:
   - **Android 8+**: Definições → Sistema → Sobre o telemóvel → tocar 7x em "Número de versão"
   - **Android 12+**: Definições → Privacidade → Opções de programador
2. Ligar telemóvel por USB ao computador
3. Autorizar depuração USB no telemóvel
4. Instalar:

```bash
adb install medwallet-debug.apk
```

Ou copiar o APK para o telemóvel (via USB, email, Google Drive) e instalar manualmente (ativar "Instalar apps de fontes desconhecidas").

---

## 🚀 Como gerar o AAB release (para Play Store)

### Passo 1: Criar keystore (apenas UMA vez na vida!)

**⚠️ CRÍTICO**: NUNCA percas este ficheiro. Sem ele, não poderás actualizar a app na Play Store.

```bash
cd android/app

keytool -genkeypair -v \
  -keystore medwallet-release.keystore \
  -alias medwallet \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

Perguntas a responder:
- **Keystore password**: escolhe uma password forte (guarda-a!)
- **Nome e apelido**: o teu nome ou o da empresa
- **Unidade organizacional**: ex. "Dev"
- **Organização**: ex. "MedWallet"
- **Cidade**: ex. "Maputo"
- **Estado/Província**: ex. "Maputo"
- **Código do país**: `MZ`
- **Key password**: igual à keystore password (ou diferente, à tua escolha)

### Passo 2: Criar `keystore.properties`

Criar ficheiro `android/keystore.properties` (NÃO fazer commit — adicionar ao `.gitignore`):

```properties
storeFile=medwallet-release.keystore
storePassword=A_TUA_PASSWORD_AQUI
keyAlias=medwallet
keyPassword=A_TUA_PASSWORD_AQUI
```

Verificar que está no `.gitignore`:

```bash
grep keystore.properties .gitignore
# Se não estiver:
echo "android/keystore.properties" >> .gitignore
echo "android/app/medwallet-release.keystore" >> .gitignore
```

### Passo 3: Mover o keystore para o sitio certo

```bash
mv medwallet-release.keystore ../  # mover para android/app/
cd ../..
```

Estrutura final:
```
android/
├── keystore.properties              ← passwords (gitignored)
├── app/
│   ├── medwallet-release.keystore   ← keystore (gitignored!)
│   └── build.gradle
└── ...
```

### Passo 4: Gerar AAB release

```bash
./scripts/build-android.sh release
```

Ou manualmente:

```bash
npm run build
npx cap sync android
cd android
./gradlew bundleRelease
```

O ficheiro `.aab` será gerado em:
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 📲 Como fazer upload à Google Play Store

### Passo 1: Criar conta Google Play Console

1. Aceder a **https://play.google.com/console**
2. Iniciar sessão com uma conta Google (recomendado: conta da empresa, não pessoal)
3. Pagar a **taxa única de 25 USD** (cartão Visa/Mastercard)
4. Completar o perfil de programador:
   - Nome do programador: **MedWallet**
   - E-mail de contacto público
   - Site: https://medwalletmz.online
   - Telefone: +258 ...

### Passo 2: Verificar identidade

O Google exige verificação de identidade para novas contas:
1. **Documentos necessários**:
   - Documento de identidade (BI, passaporte ou cartão de condução)
   - Documento da empresa (alvará, certificado de registo) se for conta empresarial
2. **Verificação por vídeo**: gravar um vídeo de 30s a mostrar o documento e o rosto
3. **Aprovação**: 2-5 dias úteis

### Passo 3: Criar nova app na Play Console

1. No dashboard, clicar **"Criar app"**
2. Preencher:
   - **Nome da app**: MedWallet
   - **Idioma padrão**: Português (Brasil) ou Português (Portugal)
   - **App类型**: App (não jogo)
   - **Gratuita ou paga**: Gratuita
3. Aceitar a declaração de conformidade com políticas dos EUA

### Passo 4: Configurar a app

Na página da app, completar estas secções (menu lateral esquerdo):

#### A. Configurar a app → "Detalhes da app"

- **Nome da app**: MedWallet
- **Descrição curta** (80 chars): Saúde, farmácia e veterinária numa só carteira.
- **Descrição completa** (4000 chars):
  ```
  O MedWallet é a tua carteira digital de saúde. Tens acesso a consultas médicas
  online, farmácia com entrega ao domicílio, triagem por inteligência artificial,
  carteira de pagamentos (M-Pesa, e-Mola), gestão de receitas médicas e muito mais.

  FUNCIONALIDADES PRINCIPAIS:
  • Consultas médicas por vídeo (telemedicina)
  • Farmácia delivery 24h em Maputo, Matola e Beira
  • Triagem inteligente com IA (Meddy)
  • Carteira digital com M-Pesa, e-Mola e mkesh
  • Receitas médicas digitais com QR code
  • Lembretes de medicamentos
  • Perfil de saúde partilhável com médicos
  • Programas B2B para médicos e clínicas

  PARA QUEM:
  - Público em geral (gratuito)
  - Médicos, clínicas e farmácias (planos pagos)

  COBERTURA:
  Moçambique (MZ), Brasil (BR), Angola (AO), África do Sul (ZA), Portugal (PT), Índia (IN)

  CONTACTO: suporte@medwalletmz.online
  ```
- **Imagem em destaque** (512x512 PNG): usar `public/icon-512.png`
- **Capturas de ecrã do telemóvel**: mínimo 2, recomendado 4-8
  - Tamanho: 320-3840px, formato PNG/JPEG
  - Mínimo: 2 capturas; máximo: 8
  - **Dica**: tira screenshots reais da app a correr no telemóvel

#### B. Configurar a app → "Privacidade"

- **Política de privacidade**: URL obrigatório (ex: `https://medwalletmz.online/privacy`)
- **Permissões da app**: declarar todas as permissões usadas:
  - **Câmera**: para upload de receitas e fotos de perfil
  - **Localização**: para farmácias próximas e entregas
  - **Notificações**: para lembretes de medicamentos e consultas
  - **Microfone**: para vídeo-consultas
  - **Armazenamento**: para guardar receitas PDF
  - **Biometria**: para autenticação segura (futuro)

#### C. Configurar a app → "Acesso à app"

- **Endereço de e-mail de suporte**: suporte@medwalletmz.online
- **Telefone de contacto**: +258 XXXXXXXXX
- **Site**: https://medwalletmz.online

#### D. Configurar a app → "Receitas"

- **Conta para receber pagamentos**: configurar Google Wallet Merchant Center
- Necessário para vendas in-app (subsidiárias B2B pagas)

#### E. Configurar a app → "Classificações"

- Preencher o questionário IARC (sobre conteúdo):
  - Violência: Nenhum
  - Sexual: Nenhum
  - Linguagem: Leve
  - Substâncias controladas: Referências a medicamentos (com prescrição)
  - Dados pessoais: Sim, recolhe dados de saúde
  - Compartilha dados: Sim, com médicos (com consentimento)
  - Resultado esperado: **Classificação 12+ ou 16+**

### Passo 5: Criar lançamento de produção

1. No menu lateral: **Produção** → **Criar novo lançamento**
2. **AAB file**: arrastar `medwallet-release.aab`
3. **Nome da versão**: ex. "1.2.0"
4. **Notas de versão** (em Português):
   ```
   Novidades nesta versão:

   🎉 Nova interface mobile otimizada
   🔐 Login com Google corrigido
   📱 Suporte PWA — instala no ecrã inicial
   💳 Carteira digital com M-Pesa, e-Mola e mkesh
   👨‍⚕️ Consultas por vídeo com médicos
   💊 Encomenda de medicamentos à farmácia
   🤖 Meddy — assistente de triagem IA
   ```

### Passo 6: Revisão e publicação

1. Clicar **"Rever lançamento"**
2. Verificar que não há erros (Play Console mostra lista de pendências)
3. **Resolvendo pendências comuns**:
   - **Política de privacidade em falta**: criar `src/pages/LegalDocs.tsx` com política e publicar em `/legal/privacy`
   - **Capturas de ecrã em falta**: tirar pelo menos 2
   - **Permissões não justificadas**: para cada permissão, justificar o uso no formulário
4. Clicar **"Iniciar implementação para produção"**
5. **Revisão do Google**: 1-7 dias úteis (normalmente 2-3 dias)
6. Receber email de aprovação → app fica disponível na Play Store

---

## 🔄 Como actualizar a app (depois da primeira publicação)

Para cada update:

1. **Atualizar versão no `android/app/build.gradle`**:
   ```gradle
   versionCode 4        // incrementar de 3 → 4
   versionName "1.2.1"  // nova versão legível
   ```

2. **Gerar novo AAB**:
   ```bash
   ./scripts/build-android.sh release
   ```

3. **Upload à Play Console**:
   - Produção → Criar novo lançamento
   - Upload do novo `.aab`
   - Notas de versão
   - Iniciar implementação

4. **Revisão**: 1-3 dias úteis (mais rápida que a primeira)

---

## 🎨 Assets necessários para a Play Store

Antes de fazer upload, prepara estes ficheiros (podes usar os gerados pelo `scripts/generate_icons.py`):

| Asset | Dimensão | Ficheiro | Formato |
|-------|----------|----------|---------|
| Ícone da app | 512x512 | `public/icon-512.png` | PNG |
| Imagem em destaque | 1024x500 | `public/play-feature.png` | PNG/JPG |
| Captura de ecrã 1 | 1080x1920 | screenshot | PNG |
| Captura de ecrã 2 | 1080x1920 | screenshot | PNG |
| Captura de ecrã 3 | 1080x1920 | screenshot | PNG |
| Captura de ecrã 4 | 1080x1920 | screenshot | PNG |

Para gerar a **imagem em destaque** da Play Store (1024x500):

```python
# Adicionar a scripts/generate_icons.py no final:
def render_play_feature(out_path):
    canvas = Image.new("RGB", (1024, 500), (4, 120, 87))
    # ... logo centrado + texto "MedWallet" à direita
    canvas.save(out_path, "PNG")
```

---

## 🧪 Testar antes do upload

### Checklist de testes no telemóvel real:

- [ ] App abre sem crashar
- [ ] Splash screen mostra correctamente (logo emerald)
- [ ] Login com email/password funciona
- [ ] Login com Google funciona
- [ ] Páginas carregam sem "A carregar..." infinito
- [ ] Câmera funciona (upload de receitas)
- [ ] GPS funciona (farmácias próximas)
- [ ] Notificações push recebidas (testar com Firebase Console)
- [ ] Pagamentos M-Pesa/e-Mola funcionam
- [ ] App funciona offline (PWA cache)
- [ ] Voltar de segundo plano não causa crash
- [ ] Rotação de ecrã (se suportado)
- [ ] Modo escuro funciona

### Testar AAB localmente antes do upload:

```bash
# Instalar bundle tool (se ainda não tiver)
# https://github.com/google/bundletool/releases

# Gerar APKs do AAB para teste
java -jar bundletool.jar build-apks \
  --bundle=medwallet-release.aab \
  --output=medwallet.apks \
  --ks=android/app/medwallet-release.keystore \
  --ks-pass=pass:A_TUA_PASSWORD \
  --ks-key-alias=medwallet \
  --key-pass=pass:A_TUA_PASSWORD

# Instalar no telemóvel (USB debugging activo)
java -jar bundletool.jar install-apks --apks=medwallet.apks
```

---

## ❓ FAQ — Problemas comuns

### Erro: "App not installed" ao instalar APK debug

**Causa**: APK debug tem `applicationIdSuffix ".debug"`, então o applicationId real é `mz.medwallet.app.debug`. Se já tens uma versão anterior instalada, pode haver conflito de assinatura.

**Solução**: desinstalar a versão anterior primeiro:
```bash
adb uninstall mz.medwallet.app.debug
# ou no telemóvel: Definições → Apps → MedWallet → Desinstalar
```

### Erro: "INSTALL_FAILED_UPDATE_INCOMPATIBLE"

Mesma causa do anterior. Desinstalar a app antiga.

### AAB rejeitado: "Missing Privacy Policy"

Criar página de política de privacidade e publicar em `https://medwalletmz.online/legal/privacy`. Já existe `src/pages/LegalDocs.tsx` no projeto.

### AAB rejeitado: "Permission requested without justification"

Para cada permissão do `AndroidManifest.xml`, justificar o uso na Play Console → App content → App permissions.

### App rejeitada: "Login with Google not configured"

O Google exige que o login Google funcione num fluxo OAuth completo. Certifica-te de que:
1. O redirect URI no Google Cloud Console inclui `mz.medwallet.app:/oauth2redirect`
2. O `server_client_id` em `strings.xml` está correcto
3. Testaste o login Google no APK debug antes do upload

### Erro de build: "Could not find keystore.properties"

Verificar que o ficheiro existe em `android/keystore.properties` (não em `android/app/`).

### Erro de build: "Failed to read key from keystore"

O `keyAlias` em `keystore.properties` não corresponde ao alias usado no `keytool`. Verificar com:
```bash
keytool -list -v -keystore medwallet-release.keystore
```

### Push notifications não chegam

1. Verificar que `google-services.json` está em `android/app/`
2. Verificar que o `applicationId` no `build.gradle` corresponde ao package name no Firebase
3. Verificar que o SHA-1 da keystore está registado no Firebase:
   ```bash
   keytool -list -v -keystore medwallet-release.keystore -alias medwallet
   ```
   Copiar o SHA-1 e adicionar em Firebase Console → Project settings → SHA-1

---

## 📊 Monitorização pós-publicação

### Google Play Console → Estatísticas

- **Crashes e ANRs**: monitoriza crashes em tempo real
- **Android vitals**: performance, bateria, estabilidade
- **Aquisições**: instalações por canal
- **Retenção**: utilizadores activos diários/mensais

### Para actualizar o que os utilizadores veem:

Como a app carrega `https://medwalletmz.online/`, **qualquer deploy na web reflecte-se imediatamente na app**. Os utilizadores não precisam de actualizar a app para ver mudanças.

Apenas precisas de fazer novo upload à Play Store quando:
- Mudares o ícone ou splash screen
- Adicionares novas permissões Android
- Quiseres mostrar uma nova versão na lista "Novidades" da Play Store

---

## 📞 Suporte

Em caso de problemas:
- **Documentação Capacitor**: https://capacitorjs.com/docs
- **Google Play Console Help**: https://support.google.com/googleplay/android-developer
- **Comunidade MedWallet**: suporte@medwalletmz.online

---

**Última actualização**: 17 de Julho de 2026
**Versão actual da app**: 1.2.0 (versionCode 3)
