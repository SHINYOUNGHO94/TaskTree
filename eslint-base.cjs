module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true,
    },
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
    },
    rules: {
        // 未使用変数の警告（_で始まる変数は無視）
        '@typescript-eslint/no-unused-vars': ["warn", { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: '^(e|err|error|ex)$' }],
        // (v9新規追加)　不要な値の代入の警告
        "no-useless-assignment": "off",
        // (v9新規追加)　空のオブジェクト型の警告
        "@typescript-eslint/no-empty-object-type": "off",
        // require()の使用を許可
        "@typescript-eslint/no-require-imports": "off",
        // (v9新規追加)　未使用の式の警告
        "@typescript-eslint/no-unused-expressions": "off",
        // 配列内の空要素の警告
        "no-sparse-arrays": "off",
        // switch文のcaseのフォールスルーの警告
        "no-fallthrough": "off",
        // (v9新規追加) catch節でエラーオブジェクトの保存の警告
        "preserve-caught-error": "off",
    },
};