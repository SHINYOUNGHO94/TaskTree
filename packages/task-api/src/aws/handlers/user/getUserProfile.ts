import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { UserRepository } from "@/repositories/userRepository";
import { CompanyRepository } from "@/repositories/companyRepository";
import { DivisionRepository } from "@/repositories/divisionRepository";
import { DepartmentRepository } from "@/repositories/departmentRepository";
import { TeamRepository } from "@/repositories/teamRepository";
import { internalServerError } from "@/errors/utils";
import { UserProfile } from "@task/core";

const tableName = process.env.TABLE_NAME || "";
const userRepo = new UserRepository(tableName);
const companyRepo = new CompanyRepository(tableName);
const divisionRepo = new DivisionRepository(tableName);
const deptRepo = new DepartmentRepository(tableName);
const teamRepo = new TeamRepository(tableName);

// ユーザーの組織情報を含む詳細プロファイルを取得するハンドラー
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("GetUserProfile Event:", JSON.stringify(event.requestContext.authorizer));

  try {
    const userId = event.requestContext.authorizer?.claims.sub;
    if (!userId) {
      console.error("User ID not found in token claims");
      return internalServerError("User ID not found in token");
    }

    // 1. ユーザー基本情報の取得
    console.log("Fetching user for ID:", userId);
    const user = await userRepo.findByUserId(userId);

    if (!user) {
      console.warn("User record not found in DynamoDB for ID:", userId);
      return {
        statusCode: 404,
        headers: { 
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message: "User profile not found. Please ensure your user record is created." }),
      };
    }

    console.log("User found:", JSON.stringify(user));

    // 2. 各組織階層の名称を取得
    const [company, division, dept, team] = await Promise.all([
      user.companyId && user.companyId !== "NONE" ? companyRepo.findById(user.companyId) : null,
      user.divisionId && user.divisionId !== "NONE" ? divisionRepo.findById(user.companyId, user.divisionId) : null,
      user.departmentId && user.departmentId !== "NONE" ? deptRepo.findById(user.divisionId, user.departmentId) : null,
      user.teamId && user.teamId !== "NONE" ? teamRepo.findById(user.departmentId, user.teamId) : null,
    ]);

    // 3. プロファイル情報の構築
    const profile: UserProfile = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      divisionId: user.divisionId,
      departmentId: user.departmentId,
      teamId: user.teamId,
      companyName: company?.name || "No Company",
      divisionName: division?.name || "No Division",
      departmentName: dept?.name || "No Department",
      teamName: team?.name || "No Team",
    };

    console.log("Profile constructed successfully");

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(profile),
    };
  } catch (error) {
    console.error("GetUserProfile Error Detail:", error);
    const message = error instanceof Error ? error.message : "Unknown Error";
    return internalServerError(message);
  }
};
