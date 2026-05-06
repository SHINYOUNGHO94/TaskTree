export interface TaskApiError {
  statusCode: number;
  body: string;
}

// 必要なデータが足りないときに使います
export const requiredFieldsMissing = (): TaskApiError => ({
  statusCode: 400,
  body: JSON.stringify({
    code: "REQUIRED_FIELDS_MISSING",
    message: "Required fields are missing",
  })
});

// リクエストの内容が正しくないときに使います
export const invalidRequestBody = (): TaskApiError => ({
  statusCode: 400,
  body: JSON.stringify({
    code: "INVALID_REQUEST_BODY",
    message: "Invalid request body",
  }),
});

// システムにエラーが起きたときに使います
export const internalServerError = (message: string = "Internal server error"): TaskApiError => ({
  statusCode: 500,
  body: JSON.stringify({
    code: "INTERNAL_SERVER_ERROR",
    message: message,
  })
});

// データが見つからないときに使います
export const notFound = (message: string = "Resource not found"): TaskApiError => ({
  statusCode: 404,
  body: JSON.stringify({
    code: "NOT_FOUND",
    message: message,
  })
});
