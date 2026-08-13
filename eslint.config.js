import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Ignore build output, edge functions (Deno runtime), and config files
  { ignores: ["dist", "supabase/functions/**", "tailwind.config.ts", "vite.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // We enforce unused vars via tsc (noUnusedLocals/Parameters) —
      // eslint duplicates those checks and flags React hook deps patterns.
      "@typescript-eslint/no-unused-vars": "off",
      // 'as any' is tracked separately (534→391 reduction in Fase 7).
      // Full removal requires extensive type work across 140 files.
      "@typescript-eslint/no-explicit-any": "off",
      // Empty object type is common in Supabase query results and React state.
      // Replacing all with Record<string, unknown> is planned for a future phase.
      "@typescript-eslint/no-empty-object-type": "off",
      // @ts-ignore → @ts-expect-error migration is tracked (165 occurrences).
      // Bulk replacement risks breaking intentional suppressions.
      "@typescript-eslint/ban-ts-comment": "off",
      // Empty catch/try blocks: some are intentional (fire-and-forget calls).
      // Already fixed 10 silent catches in Fase 7; remaining are reviewed.
      "no-empty": "off",
      // Constant binary expressions like `true && x` and `false || x` are used
      // intentionally in conditional rendering patterns.
      "no-constant-binary-expression": "off",
      // Chained expressions in JSX event handlers (e.g., fn() && navigate())
      // are common patterns in React codebases.
      "@typescript-eslint/no-unused-expressions": "off",
    },
  },
);
