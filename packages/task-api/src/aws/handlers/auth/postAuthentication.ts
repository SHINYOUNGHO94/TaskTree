import { PostAuthenticationTriggerEvent } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { CompanyRepository } from "../../../repositories/companyRepository";
import { DepartmentRepository } from "../../../repositories/departmentRepository";
import { DivisionRepository } from "../../../repositories/divisionRepository";
import { UserRole } from "@task/core";

// AdminCreateUserCommand で作成されたユーザー（メール招待経由）は postConfirmation が発火しない。
// postAuthentication は全ログイン後に発火するため、DynamoDB レコード未作成のユーザーを補完する。

export interface PostAuthenticationDeps {
  userRepo: UserRepository;
  companyRepo: CompanyRepository;
  deptRepo: DepartmentRepository;
  divisionRepo: DivisionRepository;
}

const isConditionalCheckFailed = (error: unknown): boolean =>
  error instanceof Error && error.name === "ConditionalCheckFailedException";

const createIfMissing = async (action: () => Promise<void>): Promise<void> => {
  try {
    await action();
  } catch (error) {
    if (isConditionalCheckFailed(error)) return;
    throw error;
  }
};

export const createHandler =
  (deps: PostAuthenticationDeps) =>
  async (event: PostAuthenticationTriggerEvent): Promise<PostAuthenticationTriggerEvent> => {
    const { sub: userId, email, name } = event.request.userAttributes;

    const existing = await deps.userRepo.findByUserId(userId);
    if (existing) return event;

    // レコードが存在しない場合のみ作成（初回ログイン時の補完）
    console.log(`PostAuthentication: user record missing for ${email}, creating...`);

    const companyId  = `COMP-${userId.slice(0, 8)}`;
    const divisionId = `DIV-${userId.slice(0, 8)}`;
    const deptId     = `DEPT-${userId.slice(0, 8)}`;

    await createIfMissing(() => deps.companyRepo.create(companyId, "個人組織"));
    await createIfMissing(() => deps.divisionRepo.create({ companyId, divisionId, name: "管理本部" }));
    await createIfMissing(() => deps.deptRepo.create({ companyId, divisionId, departmentId: deptId, name: "管理部" }));
    await createIfMissing(() =>
      deps.userRepo.create({
        userId,
        email,
        name: name || email,
        role: UserRole.COMPANY_ADMIN,
        companyId,
        divisionId,
        departmentId: deptId,
        teamId: "NONE",
      })
    );

    console.log(`PostAuthentication: onboarding complete for ${email}`);
    return event;
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo:    new UserRepository(tableName),
  companyRepo: new CompanyRepository(tableName),
  deptRepo:    new DepartmentRepository(tableName),
  divisionRepo: new DivisionRepository(tableName),
});
