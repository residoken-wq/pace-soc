import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    /*
     * The dashboard integrates with several third-party APIs whose response
     * shapes are only partially typed. Keep these findings visible while the
     * API boundary types are migrated incrementally, but do not block a
     * production release because of pre-existing legacy typing debt.
     *
     * React Compiler diagnostics are treated the same way for now. They are
     * valuable modernization guidance, but the application does not currently
     * compile with the React Compiler and these rules should not masquerade as
     * runtime or TypeScript build failures.
     */
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    files: ["scripts/**/*.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
