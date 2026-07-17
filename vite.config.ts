import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: { overlay: false },
  },
  optimizeDeps: {
    include: ["@number-flow/react", "react", "react-dom"],
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
    chunkSizeWarningLimit: 2000,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
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
          'vendor-ui': [
            'lucide-react',
            'framer-motion',
            'class-variance-authority',
            'clsx',
            'tailwind-merge',
            'date-fns',
            'sonner',
          ],
        },
      }
    }
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    mcpPlugin(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Não fazer cache de:
        // - API do Supabase (sempre fresh)
        // - OAuth broker da Lovable — caminho /~oauth/initiate no MESMO origin
        //   (este caminho é interceptado pelo servidor da Lovable Cloud e redireciona
        //   para o Google. Se o SW fizer fallback para index.html, o user vê "página
        //   não existe" em vez do redirect OAuth.)
        // - Google Fonts (CDN externo)
        navigateFallbackDenylist: [
          /^https:\/\/pfqruzusjxyidhqkiob\.supabase\.co\//,
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
}));
