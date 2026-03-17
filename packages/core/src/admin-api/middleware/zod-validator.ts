// Zod Validator Wrapper

import { zValidator } from "@hono/zod-validator";
import type { z } from "zod";
import type { ValidationTargets } from "hono";

/**
 * Wrapper around @hono/zod-validator that throws ZodError on validation failure
 * This allows the error handler to format the response consistently
 */
export function zodValidator<T extends z.ZodType, P extends keyof ValidationTargets>(
  target: P,
  schema: T,
) {
  return zValidator(target, schema, (result) => {
    if (!result.success) {
      throw result.error;
    }
  });
}
