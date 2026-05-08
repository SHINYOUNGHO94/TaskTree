import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { CompanyRepository } from "../../../repositories/companyRepository";
import { DepartmentRepository } from "../../../repositories/departmentRepository";
import { UserRole } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const userRepo = new UserRepository(tableName);
const companyRepo = new CompanyRepository(tableName);
const deptRepo = new DepartmentRepository(tableName);

/**
 * Cognito メール認証完了後に実行されるオンボーディング関数
 */
export const handler = async (event: PostConfirmationConfirmSignUpTriggerEvent): Promise<PostConfirmationConfirmSignUpTriggerEvent> => {
  console.log("PostConfirmation Event:", JSON.stringify(event));

  const { sub: userId, email, name } = event.request.userAttributes;

  try {
    // 1. デフォルト会社 (Company) の作成
    const companyId = `COMP-${userId.slice(0, 8)}`;
    await companyRepo.create(companyId, "個人組織 (Default)");

    // 2. デフォルト部署 (Department) の作成
    const deptId = `DEPT-${userId.slice(0, 8)}`;
    await deptRepo.create({
      companyId: companyId,
      divisionId: "NONE",
      departmentId: deptId,
      name: "一般部署",
    });

    // 3. ユーザー (User) レコードの作成
    await userRepo.create({
      userId: userId,
      email: email,
      name: name || "Unknown User",
      role: UserRole.ADMIN,
      companyId: companyId,
      divisionId: "NONE",
      departmentId: deptId,
      teamId: "NONE"
    });

    console.log(`Onboarding successful for user: ${email}`);
    return event;
  } catch (error) {
    console.error("Onboarding failed:", error);
    return event;
  }
};
