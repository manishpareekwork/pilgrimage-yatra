let tailwindPath;
try {
  // Prefer locally installed copy to avoid touching root-owned node_modules.
  tailwindPath = require.resolve("./.local_node_modules/node_modules/@tailwindcss/postcss/dist/index.js");
} catch (err) {
  // Fall back to default resolution if local copy is missing.
  tailwindPath = require.resolve("@tailwindcss/postcss/dist/index.js");
}

module.exports = {
  // Next.js expects plugin identifiers as strings; we pass the resolved path so it can be required.
  plugins: {
    [tailwindPath]: {},
    autoprefixer: {},
  },
};
