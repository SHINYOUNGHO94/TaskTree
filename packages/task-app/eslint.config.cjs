const { defineConfig, globalIgnores } = require("eslint/config");
const { FlatCompat } = require("@eslint/eslintrc");
const { fixupConfigRules } = require("@eslint/compat");
const js = require("@eslint/js");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
});

module.exports = defineConfig([
    globalIgnores([
        ".next/**",
        "node_modules/**",
        "*.log",
        "eslint.config.*",
        "next-env.d.ts"
    ]),
    ...compat.config(require("../../eslint-base.cjs")),
    ...fixupConfigRules(compat.extends(
        "next/core-web-vitals",
        "plugin:tailwindcss/recommended"
    )),
    {
        settings: {
            tailwindcss: {
                config: {},
            },
        },
        rules: {
            "@next/next/no-html-link-for-pages": "off",
            "@next/next/no-img-element": "off",
            "tailwindcss/no-custom-classname": "off",
            "tailwindcss/classnames-order": "off",
        },
    },
]);
