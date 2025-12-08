import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs,cjs}"],
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
];

export default eslintConfig;
