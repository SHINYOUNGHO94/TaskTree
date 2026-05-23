export function extractOrgError(err: unknown): string {
  if (!(err instanceof Error)) return "Unexpected error occurred";

  try {
    const parsed = JSON.parse(err.message) as { message?: string; error?: string };
    if (typeof parsed?.message === "string") return parsed.message;
    if (typeof parsed?.error === "string") return parsed.error;
  } catch {
    // not JSON — fall through
  }

  return err.message || "Unexpected error occurred";
}
