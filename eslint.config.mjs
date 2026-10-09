import { createRequire } from "node:module";
import nextVitals from "eslint-config-next/core-web-vitals";

const require = createRequire(import.meta.url);
const prettier = require("eslint-config-prettier");

const config = [
  ...nextVitals,
  prettier,
  {
    ignores: ["generated/**", ".next/**", "node_modules/**"],
    rules: {
      "react/react-in-jsx-scope": "off",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // Existing data-loading effects intentionally update local state after mount.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
];

export default config;
