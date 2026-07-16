export const CLASS_TYPES = [
  { value: "theoretical", label: "Clase teórica", topic: true },
  { value: "practical", label: "Clase práctica", topic: true },
  { value: "exam_partial", label: "Examen parcial", topic: false, max: 4 },
  { value: "exam_makeup", label: "Examen recuperatorio", topic: false, max: 4 },
  { value: "exam_final", label: "Examen final", topic: false, max: 4 },
] as const;

export type ClassTypeValue = (typeof CLASS_TYPES)[number]["value"];

const LIMITS: Record<string, number> = {
  exam_partial: 4,
  exam_makeup: 4,
  exam_final: 4,
};

export function normalizeClassType(value: unknown): ClassTypeValue {
  const v = String(value ?? "");
  if (CLASS_TYPES.some((t) => t.value === v)) {
    return v as ClassTypeValue;
  }
  return "theoretical";
}

export function classTypeLabel(type: string): string {
  return CLASS_TYPES.find((t) => t.value === type)?.label ?? "Clase teórica";
}

export function classTypeAllowsTopic(type: string): boolean {
  const found = CLASS_TYPES.find((t) => t.value === type);
  if (found) return found.topic;
  return type === "theoretical" || type === "practical";
}

/** Materiales PDF/Word solo en teórica y práctica. */
export function classTypeAllowsDocuments(type: string): boolean {
  return type === "theoretical" || type === "practical";
}

export const MAX_SESSION_DOCUMENTS = 10;
export const MAX_SESSION_DOCUMENT_BYTES = 4 * 1024 * 1024; // 4 MB

export function classTypeLimit(type: string): number | null {
  return LIMITS[type] ?? null;
}

export function classTypeBadgeTone(
  type: string,
): "teal" | "info" | "warn" | "neutral" | "success" {
  if (type === "practical") return "info";
  if (type === "exam_partial") return "warn";
  if (type === "exam_makeup") return "warn";
  if (type === "exam_final") return "success";
  return "teal";
}
