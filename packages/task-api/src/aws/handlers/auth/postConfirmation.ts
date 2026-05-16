import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { CompanyRepository } from "../../../repositories/companyRepository";
import { DepartmentRepository } from "../../../repositories/departmentRepository";
import { UserRole } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const userRepo = new UserRepository(tableName);
const companyRepo = new CompanyRepository(tableName);
const deptRepo = new DepartmentRepository(tableName);

// Cognito メール認証完了後に実行されるオンボーディング関数
export const handler = async (event: PostConfirmationConfirmSignUpTriggerEvent): Promise<PostConfirmationConfirmSignUpTriggerEvent> => {
  console.log("PostConfirmation Event:", JSON.stringify(event));

  const { sub: userId, email, name } = event.request.userAttributes;
  const companyName = event.request.clientMetadata?.companyName || "個人組織";

  try {
    // 1. デフォルト会社の作成
    const companyId = `COMP-${userId.slice(0, 8)}`;
    await companyRepo.create(companyId, companyName);

    // 2. デフォルト部署の作成
    const deptId = `DEPT-${userId.slice(0, 8)}`;
    await deptRepo.create({
      companyId: companyId,
      divisionId: "NONE",
      departmentId: deptId,
      name: "一般部署",
    });

    // 3. ユーザーレコードの作成
    await userRepo.create({
      userId: userId,
      email: email,
      name: name || "Unknown User",
      role: UserRole.COMPANY_ADMIN,
      companyId: companyId,
      divisionId: "NONE",
      departmentId: deptId,
      teamId: "NONE"
    });

    console.log(`Onboarding successful for user: ${email}`);
    return event;
  } catch (error) {
    if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
      console.log(`User or organization already exists, skipping onboarding: ${email}`);
      return event;
    }
    console.error("Onboarding failed with actual error:", error);
    // Explicitly throw error so AWS can retry or move to DLQ
    throw error;
  }
};
