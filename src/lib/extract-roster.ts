import type { ParsedStudent } from "@/lib/parse-students";
import { parseStudentListText } from "@/lib/parse-students";

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (
    type === "text/plain" ||
    type === "text/csv" ||
    name.endsWith(".txt") ||
    name.endsWith(".csv")
  ) {
    return file.text();
  }

  if (
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    name.endsWith(".xlsx")
  ) {
    return extractFromXlsx(file);
  }

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return extractFromPdf(file);
  }

  if (
    type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|bmp)$/i.test(name)
  ) {
    return extractFromImage(file);
  }

  throw new Error(
    "Formato no soportado. Usá PDF, imagen (JPG/PNG), Excel (.xlsx) o CSV/TXT.",
  );
}

export function extractStudentsFromFileText(text: string): ParsedStudent[] {
  return parseStudentListText(text);
}

async function extractFromXlsx(file: File): Promise<string> {
  const ExcelJS = (await import("exceljs")).default;
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  // exceljs accepts Buffer-like; ArrayBuffer works in modern runtimes
  await workbook.xlsx.load(buffer as never);
  const lines: string[] = [];

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      const values = row.values;
      if (!Array.isArray(values)) return;
      const cells = values
        .slice(1)
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter(Boolean);
      if (cells.length > 0) lines.push(cells.join(";"));
    });
  });

  return lines.join("\n");
}

async function extractFromPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.flatMap((item) => {
      if (
        !item ||
        typeof item !== "object" ||
        !("str" in item) ||
        typeof (item as { str?: unknown }).str !== "string" ||
        !("transform" in item) ||
        !Array.isArray((item as { transform?: unknown }).transform)
      ) {
        return [];
      }
      const typed = item as { str: string; transform: number[] };
      return [typed];
    });

    // Agrupar por renglón (coordenada Y) para no aplastar el listado
    const rows = new Map<number, { x: number; str: string }[]>();
    for (const item of items) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const x = item.transform[4];
      const bucket = rows.get(y) ?? [];
      bucket.push({ x, str: item.str });
      rows.set(y, bucket);
    }

    const orderedY = [...rows.keys()].sort((a, b) => b - a);
    const lines = orderedY.map((y) =>
      rows
        .get(y)!
        .sort((a, b) => a.x - b.x)
        .map((c) => c.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    );
    pages.push(lines.filter(Boolean).join("\n"));
  }

  const joined = pages.join("\n");
  if (joined.replace(/\s/g, "").length < 20) {
    throw new Error(
      "Este PDF parece ser una imagen escaneada sin texto. Sacá una foto nítida del listado (JPG/PNG) e intentá de nuevo.",
    );
  }
  return joined;
}

async function extractFromImage(file: File): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("spa+eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(file);
    return text;
  } finally {
    await worker.terminate();
  }
}
