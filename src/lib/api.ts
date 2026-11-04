import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function error(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, error: { message, code: code ?? "error" } },
    { status },
  );
}

export function validationError(err: ZodError) {
  return NextResponse.json(
    {
      success: false,
      error: {
        message: "Validation failed",
        code: "validation_error",
        details: err.flatten().fieldErrors,
      },
    },
    { status: 400 },
  );
}

export function unauthorized() {
  return error("Authentication required.", 401, "unauthorized");
}

export function forbidden() {
  return error("Insufficient permissions.", 403, "forbidden");
}

export function notConfigured(detail: string) {
  return error(detail, 503, "not_configured");
}

/** Wrap a route handler with uniform error handling. */
export function withApi<T extends (...args: never[]) => Promise<Response>>(
  handler: T,
): T {
  return (async (...args: never[]) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ZodError) return validationError(err);
      console.error("[api]", err);
      return error("Internal server error.", 500, "internal_error");
    }
  }) as T;
}
