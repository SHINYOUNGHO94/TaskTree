import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const outputPath = resolve(process.cwd(), process.argv[2] ?? "cdk-outputs.json");
const appEnvPath = resolve(process.cwd(), "../task-app/.env.local");
const stackName = process.argv[3] ?? "TaskInfraStack";

const requiredOutputs = {
  NEXT_PUBLIC_COGNITO_USER_POOL_ID: "CognitoUserPoolId",
  NEXT_PUBLIC_COGNITO_CLIENT_ID: "CognitoUserPoolClientId",
  NEXT_PUBLIC_API_URL: "TaskApiUrl",
};

const readOutputs = () => {
  if (!existsSync(outputPath)) {
    throw new Error(`CDK outputs file not found: ${outputPath}`);
  }

  const outputs = JSON.parse(readFileSync(outputPath, "utf8"));
  const stackOutputs = outputs[stackName];

  if (!stackOutputs) {
    throw new Error(`Stack outputs not found for "${stackName}" in ${outputPath}`);
  }

  return stackOutputs;
};

const upsertEnv = (current, updates) => {
  const seen = new Set();
  const lines = current.length > 0 ? current.split(/\r?\n/) : [];

  const nextLines = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
    if (!match) return line;

    const key = match[1];
    if (!(key in updates)) return line;

    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${value}`);
    }
  }

  return `${nextLines.filter((line, index, array) => line !== "" || index < array.length - 1).join("\n")}\n`;
};

const outputs = readOutputs();
const envUpdates = {};

for (const [envKey, outputKey] of Object.entries(requiredOutputs)) {
  const value = outputs[outputKey];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Required CDK output is missing: ${outputKey}`);
  }
  envUpdates[envKey] = value;
}

const currentEnv = existsSync(appEnvPath) ? readFileSync(appEnvPath, "utf8") : "";
writeFileSync(appEnvPath, upsertEnv(currentEnv, envUpdates), "utf8");

console.log(`Updated ${appEnvPath}`);
