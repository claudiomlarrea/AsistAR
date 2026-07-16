import path from "path";

const ALLOWED_EXT = new Set([".pdf", ".doc", ".docx"]);

const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream",
]);

export function isAllowedSessionDocument(fileName: string, mimeType: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  if (!ALLOWED_EXT.has(ext)) return false;
  if (!mimeType || mimeType === "application/octet-stream") return true;
  return ALLOWED_MIME.has(mimeType);
}

export function mimeForFileName(fileName: string, fallback = "application/octet-stream"): string {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return fallback;
}

export function safeDownloadName(fileName: string): string {
  return fileName.replace(/[^\w.\- ()áéíóúÁÉÍÓÚñÑ]+/gi, "_").slice(0, 180) || "documento.pdf";
}
