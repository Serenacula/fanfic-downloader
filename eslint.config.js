import { fileURLToPath } from "url";
import { dirname } from "path";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

export default tseslint.config(
  {
    ignores: ["dist/**", "release/**", "scripts/**", ".ai/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": ["error", { ignoreVoid: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // vi.mock/vi.fn/`as` casts make no-unsafe-* fire constantly with no value here.
    // require-await and no-unnecessary-type-assertion joined this list after the
    // initial config landed: async vi.fn() mocks that match a Promise-returning
    // interface but don't await internally, and `as never`/spyOn casts, are the
    // same mock-plumbing category — 34 findings, all in test files, none real bugs.
    files: ["src/tests/**", "src/**/__tests__/**"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
    },
  },
);
