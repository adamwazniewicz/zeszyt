import type { ApiErrorCode } from "@zeszyt/shared";

export class IduError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}
