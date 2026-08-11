---
Task ID: 1
Agent: Super Z (main)
Task: Mobile-first overhaul — diagnosis, visual heaviness, native UX, FCM, offline

Work Log:
- Read 15+ critical files: package.json, vite.config.ts, App.tsx, AppLayout.tsx, BottomNav.tsx, Header.tsx, Home.tsx (570 lines), index.css (1654 lines), PageTransition.tsx, NotificationPermissionPopup.tsx, NotificationsPanel.tsx, useNotifications.ts, usePullToRefresh.ts, OfflineManager.ts, FcmService.ts, useFcm.ts, AnimatedBackground.tsx, premium/index.tsx, lottie/index.tsx
- Diagnosed 8 root causes of mobile heaviness (see Stage Summary)
- Rewrote NotificationPermissionPopup.tsx: removed framer-motion, Lottie, FloatingParticles, GradientText, ShimmerButton, SplitText imports → pure CSS animations
- Made NotificationPermissionPopup lazy-loaded in AppLayout (was blocking initial render)
- Removed global useNotifications() from AppLayout (was creating 4+ Supabase realtime channels on EVERY page load)
- Added scroll-to-top on route change in AppLayout (native app feel)
- Added CSS mobile performance v2 rules: kills ALL infinite animations on touch devices, removes glassmorphism backdrop-filter, hides province orbs (blur(80px)), disables animated background orbs/waves/beams/dots, adds content-visibility: auto for off-screen sections
- Added stagger-children CSS class for Strava-like sequential content reveal
- Added CSS-only notification popup enter animations (notif-sheet-enter, notif-toast-enter)
- Added notif-toast-enter and notif-sheet-enter keyframes
- Added smooth scroll for all scrollable containers
- Integrated FCM into useNotifications hook (best-effort, non-blocking)
- Enhanced OfflineManager with in-memory cache + stale-while-revalidate pattern (5-min TTL)
- Updated vite.config.ts: excluded heavy libs from pre-bundle (tsparticles, gsap, lottie-react, framer-motion), externalized firebase/app and firebase/messaging
- Added stagger-children to Home.tsx main content area
- Verified build succeeds (21.36s, 262 precached entries)

Stage Summary:
- Root causes identified:
  1. NotificationPermissionPopup loaded framer-motion + Lottie + FloatingParticles on EVERY page (blocking)
  2. useNotifications() ran 4+ Supabase realtime subscriptions globally in AppLayout
  3. CSS had 1000+ lines of heavy animations (orbs, waves, beams, dots, glass, neumorphism) running on touch devices
  4. Glassmorphism (backdrop-filter: blur(16-24px)) caused GPU compositing overhead on mobile
  5. AnimatedBackground rendered 3-5 blurred orbs (blur(40-80px)) on auth/hero pages
  6. No scroll-to-top on route changes (felt non-native)
  7. No content-visibility for below-fold sections
  8. FCM existed but was not connected to the notification flow
- Files modified: 7 (NotificationPermissionPopup.tsx, AppLayout.tsx, index.css, useNotifications.ts, OfflineManager.ts, vite.config.ts, Home.tsx)
- Build: SUCCESS, 262 precached entries
