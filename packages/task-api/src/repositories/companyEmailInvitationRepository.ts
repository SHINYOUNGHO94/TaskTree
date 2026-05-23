import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  CompanyEmailInvitationRecord,
  CompanyEmailInvitationRecordType,
} from "@/aws/entities/items/companyEmailInvitationRecord";

export class CompanyEmailInvitationRepository {
  protected readonly docClient: DynamoDBDocumentClient;
  protected readonly tableName: string;

  constructor(tableName: string) {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
  }

  async save(item: CompanyEmailInvitationRecordType): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
        ConditionExpression: "attribute_not_exists(pk)",
      })
    );
  }

  async findByEmail(email: string): Promise<CompanyEmailInvitationRecordType[]> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": CompanyEmailInvitationRecord.makePk(),
          ":prefix": `Email#${email}#`,
        },
      })
    );
    return (response.Items || []) as CompanyEmailInvitationRecordType[];
  }

  async findByEmailAndCase(email: string, caseId: string): Promise<CompanyEmailInvitationRecordType | undefined> {
    const response = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND sk = :sk",
        ExpressionAttributeValues: {
          ":pk": CompanyEmailInvitationRecord.makePk(),
          ":sk": CompanyEmailInvitationRecord.makeSk(email, caseId),
        },
      })
    );
    return (response.Items?.[0]) as CompanyEmailInvitationRecordType | undefined;
  }

  async updateStatus(email: string, caseId: string, status: "ACCEPTED" | "EXPIRED"): Promise<void> {
    await this.docClient.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: {
          pk: CompanyEmailInvitationRecord.makePk(),
          sk: CompanyEmailInvitationRecord.makeSk(email, caseId),
        },
        UpdateExpression: "SET #status = :status",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":status": status },
        ConditionExpression: "attribute_exists(pk)",
      })
    );
  }
}
