import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TaskRepository } from "@/repositories/taskRepository";
import { internalServerError, invalidRequestBody } from "@/errors/utils";
import { TaskDetail } from "@task/core";

export interface CreateTaskDeps {
  repository: TaskRepository;
}

export const createHandler = (deps: CreateTaskDeps) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) return invalidRequestBody();
    const task: TaskDetail = JSON.parse(event.body);

    const creatorId = event.requestContext.authorizer?.claims.sub;
    if (!creatorId) return internalServerError("Creator ID not found");

    task.creatorId = creatorId;

    await deps.repository.save(task);

    return {
      statusCode: 201,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "Success", id: task.id }),
    };
  } catch (error) {
    console.error(error);
    return internalServerError();
  }
};

const tableName = process.env.TABLE_NAME || "";
export const handler = createHandler({
  repository: new TaskRepository(tableName)
});
