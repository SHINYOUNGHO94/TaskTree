import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { CaseRepository } from "@/repositories/caseRepository";
import { UserRepository } from "@/repositories/userRepository";
import { CaseRecord } from "@/aws/entities/items/caseRecord";
import { CaseAssignmentRecord } from "@/aws/entities/items/caseAssignmentRecord";
import { CaseVisibilityRecord } from "@/aws/entities/items/caseVisibilityRecord";
import { CaseOwnerType, CaseTargetScope } from "@task/core";
import { forbidden, internalServerError, notFound, unauthorized } from "@/errors/utils";

export interface DeleteCaseDeps {
  caseRepo: CaseRepository;
  userRepo: UserRepository;
  docClient: DynamoDBDocumentClient;
  tableName: string;
}

type PkSk = { pk: string; sk: string };

async function batchDeleteItems(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  items: PkSk[],
): Promise<void> {
  const CHUNK = 25;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({
            DeleteRequest: { Key: { pk: item.pk, sk: item.sk } },
          })),
        },
      }),
    );
  }
}

async function queryAllByCaseGsi(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  caseId: string,
): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const response = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId",
        ExpressionAttributeValues: { ":caseId": caseId },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of response.Items ?? []) {
      results.push(item as Record<string, unknown>);
    }
    lastKey = response.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return results;
}

async function deleteCaseRecursive(
  docClient: DynamoDBDocumentClient,
  tableName: string,
  caseId: string,
): Promise<void> {
  const getCaseResponse = await docClient.send(
    new GetCommand({
      TableName: tableName,
      Key: { pk: CaseRecord.makePk(), sk: CaseRecord.makeSk(caseId) },
    }),
  );

  const caseRecord = getCaseResponse.Item as Record<string, unknown> | undefined;
  if (!caseRecord) return;

  // Find all byCase-indexed records for this case
  const gsiRecords = await queryAllByCaseGsi(docClient, tableName, caseId);

  // Separate child cases from other related records
  const childCaseRecords = gsiRecords.filter((r) =>
    (r.caseSortKey as string).startsWith("ChildCase#"),
  );
  const relatedRecords = gsiRecords.filter(
    (r) => !(r.caseSortKey as string).startsWith("ChildCase#"),
  );

  // Recursively delete each child case
  for (const child of childCaseRecords) {
    const childCaseId = (child.sk as string).replace(/^Case#/, "");
    await deleteCaseRecursive(docClient, tableName, childCaseId);
  }

  // Batch delete all related records (history, comments, tasks, claims, participant companies)
  const relatedKeys: PkSk[] = relatedRecords.map((r) => ({
    pk: r.pk as string,
    sk: r.sk as string,
  }));
  if (relatedKeys.length > 0) {
    await batchDeleteItems(docClient, tableName, relatedKeys);
  }

  // Derive and delete assignment + visibility records
  const ownerType = caseRecord.ownerType as CaseOwnerType;
  const ownerId = caseRecord.ownerId as string;
  const targetScope = caseRecord.targetScope as CaseTargetScope;
  const targetScopeId = caseRecord.targetScopeId as string;

  const assigneeKey = CaseAssignmentRecord.makeAssigneeKey(ownerType, ownerId);
  const visibilityKey = CaseVisibilityRecord.makeVisibilityKey(targetScope, targetScopeId);

  const accessKeys: PkSk[] = [
    {
      pk: CaseAssignmentRecord.makePk(),
      sk: CaseAssignmentRecord.makeSk(caseId, assigneeKey),
    },
    {
      pk: CaseVisibilityRecord.makePk(),
      sk: CaseVisibilityRecord.makeSk(caseId, visibilityKey),
    },
  ];
  await batchDeleteItems(docClient, tableName, accessKeys);

  // Delete the main case record
  await batchDeleteItems(docClient, tableName, [
    { pk: CaseRecord.makePk(), sk: CaseRecord.makeSk(caseId) },
  ]);
}

export const createHandler =
  (deps: DeleteCaseDeps) =>
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const userId = event.requestContext.authorizer?.claims.sub;
      if (!userId) return unauthorized();

      const caseId = event.pathParameters?.id;
      if (!caseId) return notFound("Case not found");

      const [profile, existingCase] = await Promise.all([
        deps.userRepo.findByUserId(userId),
        deps.caseRepo.findById(caseId),
      ]);

      if (!profile) return internalServerError("User profile not found");
      if (!existingCase) return notFound("Case not found");

      if (existingCase.companyId !== profile.companyId) {
        return forbidden("You do not have access to this case");
      }

      if (existingCase.creatorId !== userId) {
        return forbidden("Only the case creator can delete this case");
      }

      await deleteCaseRecursive(deps.docClient, deps.tableName, caseId);

      return {
        statusCode: 204,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: "",
      };
    } catch (error) {
      console.error(error);
      return internalServerError();
    }
  };

const tableName = process.env.TABLE_NAME || "";
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = createHandler({
  caseRepo: new CaseRepository(tableName),
  userRepo: new UserRepository(tableName),
  docClient,
  tableName,
});
