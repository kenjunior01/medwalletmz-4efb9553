# Guia de Publicação Mobile - MedWallet

Este projeto foi convertido para um aplicativo mobile usando **Capacitor**. Isso garante que o aplicativo esteja sempre sincronizado com o site.

## 🚀 Como gerar os pacotes para as lojas

### 1. Requisitos Prévios
- **Android:** Android Studio instalado.
- **iOS:** macOS com Xcode instalado.
- **Node.js:** v18 ou superior.

### 2. Sincronização de Mudanças
Sempre que fizer uma mudança no código web (React), execute:
```bash
npm run build
npx cap sync
```

### 3. Build para Android (Google Play)
1. Abra o projeto no Android Studio:
   ```bash
   npx cap open android
   ```
2. No Android Studio, vá em **Build > Generate Signed Bundle / APK**.
3. Siga as instruções para criar uma chave de assinatura (keystore) e gerar o arquivo `.aab`.
4. Faça o upload do `.aab` no [Google Play Console](https://play.google.com/console).

### 4. Build para iOS (Apple Store)
1. Abra o projeto no Xcode:
   ```bash
   npx cap open ios
   ```
2. No Xcode, selecione o alvo **App** e vá na aba **Signing & Capabilities** para configurar sua conta de desenvolvedor Apple.
3. Vá em **Product > Archive**.
4. Após o archive, use o **Distribute App** para enviar para o [App Store Connect](https://appstoreconnect.apple.com).

## 🛠 Funcionalidades Nativas Integradas
O aplicativo já possui suporte configurado para:
- **Status Bar:** Cores customizadas para combinar com a marca.
- **Splash Screen:** Tela de abertura profissional.
- **Geolocalização:** Para rastreio de farmácias e entregas.
- **Câmera:** Para upload de documentos e receitas.
- **Notificações Push:** Base configurada para integração com Firebase/OneSignal.

## 🔄 Sincronização Total
Como o Capacitor carrega o diretório `dist`, qualquer atualização no seu backend Supabase ou no frontend React será refletida automaticamente no aplicativo assim que o usuário abrir o app (se você usar técnicas de CodePush ou simplesmente atualizar o site).

---
Desenvolvido por Manus.
