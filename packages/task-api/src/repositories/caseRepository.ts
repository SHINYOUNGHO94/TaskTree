import { QueryCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { CaseDetail, CaseOwnerType, CaseTargetScope } from "@task/core";
import { BaseRepository } from "./baseRepository";
import { CaseRecord, CaseRecordType } from "@/aws/entities/items/caseRecord";
import {
  CaseAssignmentRecord,
  CaseAssignmentRecordType,
} from "@/aws/entities/items/caseAssignmentRecord";
import {
  CaseVisibilityRecord,
  CaseVisibilityRecordType,
} from "@/aws/entities/items/caseVisibilityRecord";

export class CaseRepository extends BaseRepository<CaseRecordType> {
  constructor(tableName: string) {
    super(tableName);
  }

  async save(caseDetail: CaseDetail): Promise<void> {
    const record = CaseRecord.fromDetail(caseDetail);
    await this.put(record);
  }

  async saveWithAccessRecords(caseDetail: CaseDetail): Promise<void> {
    const caseRecord = CaseRecord.fromDetail(caseDetail);
    const assignmentRecord = CaseAssignmentRecord.fromDetail(caseDetail);
    const visibilityRecord = CaseVisibilityRecord.fromDetail(caseDetail);

    await this.docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: this.tableName,
              Item: caseRecord,
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: assignmentRecord,
            },
          },
          {
            Put: {
              TableName: this.tableName,
              Item: visibilityRecord,
            },
          },
        ],
      }),
    );
  }

  async findById(caseId: string): Promise<CaseDetail | undefined> {
    const pk = CaseRecord.makePk();
    const sk = CaseRecord.makeSk(caseId);
    const record = await this.get(pk, sk);
    return record ? CaseRecord.toDetail(record) : undefined;
  }

  async findChildrenByParentCaseId(parentCaseId: string): Promise<CaseDetail[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "byCase",
        KeyConditionExpression: "caseId = :caseId AND begins_with(caseSortKey, :prefix)",
        ExpressionAttributeValues: {
          ":caseId": parentCaseId,
          ":prefix": "ChildCase#",
        },
      }),
    );
    return ((response.Items ?? []) as CaseRecordType[]).map(CaseRecord.toDetail);
  }

  async findByUser(params: {
    companyId: string;
    divisionId: string;
    departmentId: string;
    teamId: string;
    userId: string;
    userRoleRank: number;
  }): Promise<CaseDetail[]> {
    const { companyId, divisionId, departmentId, teamId, userId, userRoleRank } = params;

    const assigneeKeys = [
      CaseAssignmentRecord.makeAssigneeKey(CaseOwnerType.COMPANY, companyId),
      ...(divisionId && divisionId !== "NONE"
        ? [CaseAssignmentRecord.makeAssigneeKey(CaseOwnerType.DIVISION, divisionId)]
        : []),
      ...(departmentId && departmentId !== "NONE"
        ? [CaseAssignmentRecord.makeAssigneeKey(CaseOwnerType.DEPARTMENT, departmentId)]
        : []),
      ...(teamId && teamId !== "NONE"
        ? [CaseAssignmentRecord.makeAssigneeKey(CaseOwnerType.TEAM, teamId)]
        : []),
      CaseAssignmentRecord.makeAssigneeKey(CaseOwnerType.USER, userId),
    ];

    const assignmentResponses = await Promise.all(
      assigneeKeys.map((assigneeKey) =>
        this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: "byAssignee",
            KeyConditionExpression: "assigneeKey = :assigneeKey",
            FilterExpression: "ownerCompanyId = :companyId",
            ExpressionAttributeValues: {
              ":assigneeKey": assigneeKey,
              ":companyId": companyId,
            },
          }),
        ),
      ),
    );

    const visibilityKeys: string[] = [
      CaseVisibilityRecord.makeVisibilityKey(CaseTargetScope.COMPANY, companyId),
      ...(divisionId && divisionId !== "NONE"
        ? [CaseVisibilityRecord.makeVisibilityKey(CaseTargetScope.DIVISION, divisionId)]
        : []),
      ...(departmentId && departmentId !== "NONE"
        ? [CaseVisibilityRecord.makeVisibilityKey(CaseTargetScope.DEPARTMENT, departmentId)]
        : []),
      ...(teamId && teamId !== "NONE"
        ? [CaseVisibilityRecord.makeVisibilityKey(CaseTargetScope.TEAM, teamId)]
        : []),
      CaseVisibilityRecord.makeVisibilityKey(CaseTargetScope.USER, userId),
    ];

    const visibilityResponses = await Promise.all(
      visibilityKeys.map((visibilityKey) =>
        this.docClient.send(
          new QueryCommand({
            TableName: this.tableName,
            IndexName: "byVisibility",
            KeyConditionExpression: "visibilityKey = :visibilityKey",
            FilterExpression: "ownerCompanyId = :companyId AND requiredRoleRank <= :userRoleRank",
            ExpressionAttributeValues: {
              ":visibilityKey": visibilityKey,
              ":companyId": companyId,
              ":userRoleRank": userRoleRank,
            },
          }),
        ),
      ),
    );

    const assignmentItems = assignmentResponses.flatMap(
      (response) => (response.Items ?? []) as CaseAssignmentRecordType[],
    );
    const visibilityItems = visibilityResponses.flatMap(
      (response) => (response.Items ?? []) as CaseVisibilityRecordType[],
    );

    const caseIds = [
      ...assignmentItems.map((item) => item.caseId),
      ...visibilityItems.map((item) => item.caseId),
    ];

    const seenIds = new Set<string>();
    const uniqueCaseIds = caseIds.filter((caseId) => {
      if (seenIds.has(caseId)) return false;
      seenIds.add(caseId);
      return true;
    });

    const details = await Promise.all(uniqueCaseIds.map((caseId) => this.findById(caseId)));
    return details.filter((detail): detail is CaseDetail => detail !== undefined);
  }
}
