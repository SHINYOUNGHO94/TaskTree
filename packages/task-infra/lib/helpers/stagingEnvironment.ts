export const StagingEnvironment = {
  development: "development",
  staging: "staging",
  production: "production",
} as const;

export type StagingEnvironment = typeof StagingEnvironment[keyof typeof StagingEnvironment];
