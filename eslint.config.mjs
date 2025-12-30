import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const config = [
  // Ignore files first
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "public/mockServiceWorker.js",
      "scripts/**",
      "server.js",
      "coverage/**",
    ],
  },
  // Load Next.js recommended + TypeScript rules via compat
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
  }),
  // Custom rules for TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // Do not introduce server-side databases – this app uses Redis/KV only.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "pg", message: "Postgres clients are not allowed. Use Redis/KV only." },
            { name: "mongoose", message: "MongoDB is not allowed. Use Redis/KV only." },
            { name: "mysql2", message: "SQL DBs are not allowed. Use Redis/KV only." },
            { name: "@prisma/client", message: "ORMs are not allowed. Use Redis/KV only." },
            { name: "prisma", message: "Prisma is not allowed. Use Redis/KV only." },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.object.name='fetch'][callee.arguments.0.value='/api/osm/']",
          message: "Direct OSM URL usage is only allowed in the proxy route.",
        },
      ],
    },
  },
  // Disable require imports check for tailwind config
  {
    files: ["tailwind.config.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // E2E test fixtures can use any and hook patterns
  {
    files: ["tests/e2e/**/*.ts"],
    rules: {
      "react-hooks/rules-of-hooks": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Jest setup and middleware can use any for global polyfills
  {
    files: ["jest.setup.ts", "middleware.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default config;
