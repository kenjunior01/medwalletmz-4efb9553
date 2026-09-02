import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

export default defineConfig(({ mode }) => {
  // Lovable Cloud exposes canonical SUPABASE_* variables during deployment.
  // Map them to the VITE_* names expected by the generated browser client.
  const define: Record<string, string> = {};
  const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const supabasePublishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const supabaseProjectId = process.env.VITE_SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID;

  if (supabaseUrl) define['import.meta.env.VITE_SUPABASE_URL'] = JSON.stringify(supabaseUrl);
  if (supabasePublishableKey) define['import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY'] = JSON.stringify(supabasePublishableKey);
  if (supabaseProjectId) define['import.meta.env.VITE_SUPABASE_PROJECT_ID'] = JSON.stringify(supabaseProjectId);

  return {
  define,
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  optimizeDeps: {
    include: ["@number-flow/react", "react", "react-dom", "date-fns"],
    // Heavy libs excluded from pre-bundle — loaded lazily per page
    exclude: ["@tsparticles/react", "gsap", "@gsap/react", "lottie-react", "framer-motion", "firebase/app", "firebase/messaging"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  // Desativar esbuild para minificação e usar o padrão interno do Vite de forma conservadora
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 200,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      // firebase is NOT installed — dynamic imports are try/catch in FcmService.ts.
      // external makes Rollup leave the bare specifier; the browser rejects it at
      // runtime and the catch block degrades gracefully.
      // Dev mode is handled by /* @vite-ignore */ in the source.
      external: ['firebase/app', 'firebase/messaging'],
      output: {
        // Chunks estratégicos para melhor cache do browser:
        // - vendor-react: React, ReactDOM, Router (muda raramente)
        // - vendor-supabase: Supabase client (muda raramente)
        // - vendor-ui: shadcn/ui + Radix + Tailwind (muda raramente)
        // - vendor-maps: Google Maps + tracking (grande, lazy)
        // Isto faz com que o utilizador só re-download do vendor-*
        // quando há update de dependências, não a cada deploy.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-motion': ['framer-motion', 'gsap', '@gsap/react'],
        'vendor-ui': [
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'date-fns',
            'sonner',
            'zod',
            'vaul',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-accordion',
            '@radix-ui/react-slot',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-progress',
            '@radix-ui/react-switch',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-popover',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-avatar',
          ],
            // Heavy libs that should only load in their specific pages
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['jspdf'],
          'vendor-video': ['@daily-co/daily-js'],
          'vendor-analytics': ['posthog-js'],
          'vendor-xlsx': ['xlsx'],
        },
      }
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mode === 'development' && mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 2000000,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Não fazer cache de:
        // - API do Supabase (sempre fresh)
        // - OAuth broker da Lovable — caminho /~oauth/initiate no MESMO origin
        //   (este caminho é interceptado pelo servidor da Lovable Cloud e redireciona
        //   para o Google. Se o SW fizer fallback para index.html, o user vê "página
        //   não existe" em vez do redirect OAuth.)
        // - Google Fonts (CDN externo)
        navigateFallbackDenylist: [
          /^https:\/\/pfqruzusjjxyidhqkiob\.supabase\.co\//,
          /^https:\/\/oauth\.lovable\.app\//,
          /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
          // Caminho relativo /~oauth/ no mesmo origin (broker Lovable Cloud)
          /\/~oauth\//,
        ],
        runtimeCaching: [
          {
            // Cache de fonts do Google (CacheFirst — são imutáveis)
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cache de CSS de fonts (StaleWhileRevalidate)
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-css',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Imagens e assets estáticos (CacheFirst)
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ].filter(Boolean),
  };
});
