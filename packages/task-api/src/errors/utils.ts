export interface TaskApiError {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

const COMMON_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
};

export const requiredFieldsMissing = (): TaskApiError => ({
  statusCode: 400,
  headers: COMMON_HEADERS,
  body: JSON.stringify({
    code: "REQUIRED_FIELDS_MISSING",
    message: "Required fields are missing",
  })
});

export const invalidRequestBody = (): TaskApiError => ({
  statusCode: 400,
  headers: COMMON_HEADERS,
  body: JSON.stringify({
    code: "INVALID_REQUEST_BODY",
    message: "Invalid request body",
  }),
});

export const unauthorized = (message: string = "Unauthorized"): TaskApiError => ({
  statusCode: 401,
  headers: COMMON_HEADERS,
  body: JSON.stringify({
    code: "UNAUTHORIZED",
    message,
  }),
});

export const forbidden = (message: string = "Access denied"): TaskApiError => ({
  statusCode: 403,
  headers: COMMON_HEADERS,
  body: JSON.stringify({
    code: "FORBIDDEN",
    message,
  }),
});

export const internalServerError = (message: string = "Internal server error"): TaskApiError => ({
  statusCode: 500,
  headers: COMMON_HEADERS,
  body: JSON.stringify({
    code: "INTERNAL_SERVER_ERROR",
    message: message,
  })
});

export const notFound = (message: string = "Resource not found"): TaskApiError => ({
  statusCode: 404,
  headers: COMMON_HEADERS,
  body: JSON.stringify({
    code: "NOT_FOUND",
    message: message,
  })
});
