import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

export abstract class BaseRepository<T extends { pk: string; sk: string }> {
  protected readonly docClient: DynamoDBDocumentClient;
  protected readonly tableName: string;

  constructor(tableName: string) {
    const client = new DynamoDBClient({});
    this.docClient = DynamoDBDocumentClient.from(client);
    this.tableName = tableName;
  }

  protected async put(item: T): Promise<void> {
    await this.docClient.send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  protected async get(pk: string, sk: string): Promise<T | undefined> {
    const response = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { pk, sk },
      })
    );
    return response.Item as T | undefined;
  }

  protected async delete(pk: string, sk: string): Promise<void> {
    await this.docClient.send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: { pk, sk },
      })
    );
  }
}
