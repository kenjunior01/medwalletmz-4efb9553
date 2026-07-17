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
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000,
        globPatterns: ["**/*.{js,css,html}"],
      }
    }),
  ].filter(Boolean),
}));
