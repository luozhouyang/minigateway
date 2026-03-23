import { readDashboardSettings } from "@/lib/dashboard-settings";

export function getErrorMessage(error: unknown, fallback = "Unexpected error"): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function parseCommaSeparatedInput(
  value: string,
  options?: { uppercase?: boolean },
): string[] | undefined {
  const parsed = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => (options?.uppercase ? item.toUpperCase() : item));

  return parsed.length > 0 ? parsed : undefined;
}

export function joinCommaSeparated(values?: string[] | null): string {
  return values?.join(", ") || "";
}

export function parseOptionalNumber(value: string | number | null | undefined): number | undefined {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseJsonInput<T>(value: string, label: string): T | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

export function stringifyJson(value: Record<string, unknown> | null | undefined): string {
  return JSON.stringify(value ?? {}, null, 2);
}

export function previewJson(value: unknown, maxLength = 96): string {
  const text = JSON.stringify(value ?? {}, null, 0);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1)}…`;
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  return date.toLocaleDateString();
}

export function formatTimestamp(
  dateString?: string | null,
  showRelativeTimes = readDashboardSettings().showRelativeTimes,
): string {
  if (!dateString) {
    return "—";
  }

  if (showRelativeTimes) {
    return formatRelativeTime(dateString);
  }

  return new Date(dateString).toLocaleString();
}

export function formatList(values?: string[] | null): string {
  return values && values.length > 0 ? values.join(", ") : "—";
}

export async function confirmAction(message: string): Promise<boolean> {
  if (typeof window === "undefined") {
    return true;
  }

  if (!readDashboardSettings().confirmBeforeDelete) {
    return true;
  }

  return window.confirm(message);
}

export function buildScopeLabel(parts: Array<string | null | undefined>): string {
  const visibleParts = parts.filter(Boolean);
  return visibleParts.length > 0 ? visibleParts.join(" / ") : "Global";
}

export function sortByCreatedAtDescending<T extends { createdAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
}
