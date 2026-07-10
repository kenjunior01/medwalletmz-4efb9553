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
        manualChunks: undefined
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
