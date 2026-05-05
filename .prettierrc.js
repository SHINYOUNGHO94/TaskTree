module.exports = {
  printWidth: 100,
  endOfLine: "auto",

  plugins: ["prettier-plugin-organize-imports", "prettier-plugin-tailwindcss"],

  tailwindFunctions: ["clsx"],

  overrides: [
    {
      files: ["packages/task-ui/**/*.{ts,tsx,js,jsx,css}"],
      options: {
        tailwindConfig: "./packages/task-ui/tailwind.config.ts",
      },
    },
    {
      files: ["packages/task-app/**/*.{ts,tsx,js,jsx,css}"],
      options: {
        tailwindConfig: "./packages/task-app/tailwind.config.ts",
      },
    },
  ],
};
