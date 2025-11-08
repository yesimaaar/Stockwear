module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  extends: ["next", "next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  ignorePatterns: [".next", "node_modules", "dist", "build"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        args: "after-used",
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "react/display-name": "off",
    "no-console": ["warn", { allow: ["warn", "error"] }],
  },
}
