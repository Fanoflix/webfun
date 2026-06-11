import { createRequire } from "node:module"

const require = createRequire(import.meta.url)

/**
 * Resolve the plugin to an absolute path. Under Yarn PnP, prettier's plugin
 * loader can't resolve a bare specifier (it imports from a synthetic root
 * module PnP doesn't know about), but `require.resolve` from this real config
 * file works fine.
 *
 * @type {import("prettier").Config}
 */
export default {
  endOfLine: "lf",
  semi: false,
  singleQuote: false,
  tabWidth: 2,
  trailingComma: "es5",
  printWidth: 80,
  plugins: [require.resolve("prettier-plugin-tailwindcss")],
  tailwindStylesheet: "src/styles.css",
  tailwindFunctions: ["cn", "cva"],
}
