// Centralized Error Handling Middleware

import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { ApiErrorResponse, ErrorCode, StatusCode } from "../types.js";
import { errorResponse } from "../responses.js";
import { ZodError } from "zod";

/**
 * Global error handler for the Admin API
 * Catches all errors and returns consistent JSON error responses
 */
export const errorHandler: ErrorHandler = (err, c) => {
  console.error("[AdminAPI Error]", err);

  // Zod validation errors
  if (err instanceof ZodError) {
    const details = err.issues.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
    const response = errorResponse("VALIDATION_ERROR", "Validation failed", details);
    return c.json(response as ApiErrorResponse, 400);
  }

  // HTTPException from Hono
  if (err instanceof HTTPException) {
    const statusCode = err.status;
    let code: ErrorCode = "INTERNAL_ERROR";
    let message = err.message;

    if (statusCode === 400) {
      code = "BAD_REQUEST";
    } else if (statusCode === 401) {
      code = "UNAUTHORIZED";
    } else if (statusCode === 403) {
      code = "FORBIDDEN";
    } else if (statusCode === 404) {
      code = "NOT_FOUND";
    } else if (statusCode >= 500) {
      code = "INTERNAL_ERROR";
      message = "An internal error occurred";
    }

    const response = errorResponse(code, message);
    return c.json(response as ApiErrorResponse, statusCode);
  }

  // ApiError from our codebase
  if (err instanceof ApiError) {
    const response = errorResponse(err.code, err.message, err.details);
    return c.json(response as ApiErrorResponse, err.status as any);
  }

  // Database unique constraint violations
  const errorMessage = err instanceof Error ? err.message : "Unknown error";

  if (errorMessage.includes("UNIQUE constraint failed")) {
    const match = errorMessage.match(/UNIQUE constraint failed: .+\.(.+)/);
    const field = match ? match[1] : "resource";
    const response = errorResponse("CONFLICT", `${field} already exists`);
    return c.json(response as ApiErrorResponse, 409);
  }

  // Foreign key constraint violations
  if (errorMessage.includes("FOREIGN KEY constraint failed")) {
    const response = errorResponse("BAD_REQUEST", "Referenced resource does not exist");
    return c.json(response as ApiErrorResponse, 400);
  }

  // Default internal error
  const response = errorResponse("INTERNAL_ERROR", "An internal error occurred");
  return c.json(response as ApiErrorResponse, 500);
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public status: StatusCode,
    message: string,
    public details?: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static notFound(resource: string): ApiError {
    return new ApiError("NOT_FOUND", 404, `${resource} not found`);
  }

  static conflict(message: string): ApiError {
    return new ApiError("CONFLICT", 409, message);
  }

  static badRequest(
    message: string,
    details?: Array<{ field: string; message: string }>,
  ): ApiError {
    return new ApiError("BAD_REQUEST", 400, message, details);
  }
}
