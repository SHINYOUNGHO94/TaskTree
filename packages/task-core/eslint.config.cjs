const { defineConfig, globalIgnores } = require("eslint/config");
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    globalIgnores([
        "dist/**",
        "node_modules/**",
        "*.log",
        "eslint.config.*"
    ]),
    ...compat.config(require("../../eslint-base.cjs")),
]);
