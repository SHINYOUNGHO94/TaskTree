import { PostConfirmationConfirmSignUpTriggerEvent } from "aws-lambda";
import { UserRepository } from "../../../repositories/userRepository";
import { CompanyRepository } from "../../../repositories/companyRepository";
import { DepartmentRepository } from "../../../repositories/departmentRepository";
import { DivisionRepository } from "../../../repositories/divisionRepository";
import { UserRole } from "@task/core";

export interface PostConfirmationDeps {
  userRepo: UserRepository;
  companyRepo: CompanyRepository;
  deptRepo: DepartmentRepository;
  divisionRepo: DivisionRepository;
}

const isConditionalCheckFailed = (error: unknown): boolean =>
  error instanceof Error && error.name === "ConditionalCheckFailedException";

const createIfMissing = async (
  action: () => Promise<void>,
  alreadyExistsMessage: string,
): Promise<void> => {
  try {
    await action();
  } catch (error) {
    if (isConditionalCheckFailed(error)) {
      console.log(alreadyExistsMessage);
      return;
    }
    throw error;
  }
};

export const createHandler =
  (deps: PostConfirmationDeps) =>
  async (
    event: PostConfirmationConfirmSignUpTriggerEvent
  ): Promise<PostConfirmationConfirmSignUpTriggerEvent> => {
    console.log("PostConfirmation Event:", JSON.stringify(event));

    const { sub: userId, email, name } = event.request.userAttributes;
    const companyName = event.request.clientMetadata?.companyName || "個人組織";

    try {
      const companyId = `COMP-${userId.slice(0, 8)}`;
      const divisionId = `DIV-${userId.slice(0, 8)}`;
      const deptId = `DEPT-${userId.slice(0, 8)}`;

      await createIfMissing(
        () => deps.companyRepo.create(companyId, companyName),
        `Company already exists, continuing onboarding: ${companyId}`,
      );

      await createIfMissing(
        () =>
          deps.divisionRepo.create({
            companyId,
            divisionId,
            name: "管理本部",
          }),
        `Division already exists, continuing onboarding: ${divisionId}`,
      );

      await createIfMissing(
        () =>
          deps.deptRepo.create({
            companyId,
            divisionId,
            departmentId: deptId,
            name: "管理部",
          }),
        `Department already exists, continuing onboarding: ${deptId}`,
      );

      await createIfMissing(
        () =>
          deps.userRepo.create({
            userId,
            email,
            name: name || "Unknown User",
            role: UserRole.COMPANY_ADMIN,
            companyId,
            divisionId,
            departmentId: deptId,
            teamId: "NONE",
          }),
        `User already exists, onboarding complete: ${email}`,
      );

      console.log(`Onboarding successful for user: ${email}`);
      return event;
    } catch (error) {
      console.error("Onboarding failed with actual error:", error);
      // Explicitly throw error so AWS can retry or move to DLQ
      throw error;
    }
  };

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  userRepo: new UserRepository(tableName),
  companyRepo: new CompanyRepository(tableName),
  deptRepo: new DepartmentRepository(tableName),
  divisionRepo: new DivisionRepository(tableName),
});
