import { customAlphabet } from "nanoid";

const nano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 10);

export function newQrToken(): string {
  return nano();
}

export function classTypeLabel(type: string): string {
  return type === "practical" ? "Práctica" : "Teórica";
}

export function statusLabel(status: string): string {
  if (status === "open") return "Abierta";
  if (status === "closed") return "Cerrada";
  return "Programada";
}

export function formatDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function formatTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function appUrl(path = ""): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function minutesBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}
