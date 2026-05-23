// テスト用アカウントの初期データを Cognito と DynamoDB に投入するスクリプト。
// postConfirmation トリガーと同じレコード構造を再現し、デプロイ直後から動作確認できる状態にする。
// 冪等性あり — 既存リソースは上書きせずスキップする。
//
// 注意: テスト用メールアドレスとパスワードはポートフォリオ用途のためハードコードしている。
// 本番環境では環境変数 TEST_USER_EMAIL / TEST_USER_PASSWORD で上書きすること。

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

const outputPath = resolve(process.cwd(), process.argv[2] ?? "cdk-outputs.json");
const stackName  = process.argv[3] ?? "TaskInfraStack";

const TEST_EMAIL    = process.env.TEST_USER_EMAIL    ?? "test@tasktree.dev";
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? "TaskTree123@";
const TEST_NAME     = process.env.TEST_USER_NAME     ?? "テストユーザー";
const REGION        = "ap-northeast-1";

if (!existsSync(outputPath)) {
  console.error(`CDK outputs not found: ${outputPath}`);
  process.exit(1);
}

const rawOutputs   = JSON.parse(readFileSync(outputPath, "utf8"));
const stackOutputs = rawOutputs[stackName];
if (!stackOutputs) {
  console.error(`Stack "${stackName}" not found in outputs`);
  process.exit(1);
}

const userPoolId = stackOutputs["CognitoUserPoolId"];
if (!userPoolId) {
  console.error("CognitoUserPoolId missing from CDK outputs");
  process.exit(1);
}

// テーブル名は CDK output の JSON 文字列に埋め込まれているためパースして取得する
const dbConfigKey = Object.keys(stackOutputs).find((k) => k.includes("DynamoDB") || k.includes("Entities"));
if (!dbConfigKey) {
  console.error("DynamoDB configuration output not found");
  process.exit(1);
}
const { tableName } = JSON.parse(stackOutputs[dbConfigKey]);
if (!tableName) {
  console.error("tableName missing from DynamoDB configuration output");
  process.exit(1);
}

console.log(`UserPoolId : ${userPoolId}`);
console.log(`Table      : ${tableName}`);
console.log(`Test user  : ${TEST_EMAIL}`);

const cognito = new CognitoIdentityProviderClient({ region: REGION });
const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

// 既存レコードがある場合はスキップ（冪等）
const putIfMissing = async (item, label) => {
  try {
    await dynamo.send(new PutCommand({
      TableName: tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(pk)",
    }));
    console.log(`  Created ${label}`);
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log(`  Exists  ${label} — skip`);
    } else {
      throw err;
    }
  }
};

let userId;
try {
  const res = await cognito.send(new AdminCreateUserCommand({
    UserPoolId: userPoolId,
    Username: TEST_EMAIL,
    TemporaryPassword: "Tmp1!" + Math.random().toString(36).slice(2),
    MessageAction: "SUPPRESS",
    UserAttributes: [
      { Name: "email",          Value: TEST_EMAIL },
      { Name: "email_verified", Value: "true" },
      { Name: "name",           Value: TEST_NAME },
    ],
  }));
  userId = res.User.Attributes.find((a) => a.Name === "sub")?.Value;
  console.log(`Cognito user created: ${userId}`);
} catch (err) {
  if (err.name === "UsernameExistsException") {
    const list = await cognito.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${TEST_EMAIL}"`,
      Limit: 1,
    }));
    userId = list.Users?.[0]?.Attributes?.find((a) => a.Name === "sub")?.Value;
    console.log(`Cognito user already exists: ${userId}`);
  } else {
    throw err;
  }
}

if (!userId) {
  console.error("Could not resolve userId");
  process.exit(1);
}

// FORCE_CHANGE_PASSWORD 状態をスキップして即座にログイン可能にする
await cognito.send(new AdminSetUserPasswordCommand({
  UserPoolId: userPoolId,
  Username: TEST_EMAIL,
  Password: TEST_PASSWORD,
  Permanent: true,
}));
console.log("Password set (permanent)");

// postConfirmation と同じレコード構造で DynamoDB に初期データを投入する
const now         = new Date().toISOString();
const companyId   = `COMP-${userId.slice(0, 8)}`;
const divisionId  = `DIV-${userId.slice(0, 8)}`;
const deptId      = `DEPT-${userId.slice(0, 8)}`;

await putIfMissing(
  { pk: "Company", sk: `Company#${companyId}`, Company: companyId, name: "テスト会社", at: now },
  `Company(${companyId})`
);

await putIfMissing(
  { pk: "Division", sk: `Company#${companyId}#Division#${divisionId}`, divisionId, companyId, name: "管理本部", at: now },
  `Division(${divisionId})`
);

await putIfMissing(
  { pk: "Department", sk: `Division#${divisionId}#Department#${deptId}`, departmentId: deptId, companyId, divisionId, name: "管理部", at: now },
  `Department(${deptId})`
);

await putIfMissing(
  {
    pk: "User",
    sk: `Team#NONE#User#${userId}`,
    User: userId,
    email: TEST_EMAIL,
    name: TEST_NAME,
    role: "COMPANY_ADMIN",
    companyId,
    divisionId,
    departmentId: deptId,
    teamId: "NONE",
    at: now,
  },
  `User(${TEST_EMAIL})`
);

console.log("\nSeed complete.");
console.log(`  Email    : ${TEST_EMAIL}`);
console.log(`  Password : ${TEST_PASSWORD}`);
