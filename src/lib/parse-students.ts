export type ParsedStudent = {
  studentName: string;
  studentDni: string;
};

const HEADER_RE =
  /^(apellido|nombre|dni|legajo|alumno|documento|matricula|usar este|n[°ºo]\.?|orden|#)\b/i;

/**
 * Extrae alumnos (nombre + DNI/legajo) de texto pegado, OCR o PDF.
 * Soporta líneas normales y listados "aplastados" en una sola línea.
 */
export function parseStudentListText(text: string): ParsedStudent[] {
  const cleaned = text
    .replace(/\u00a0/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();

  const fromLines = parseByLines(cleaned);
  const fromFlat = parseFlattenedRoster(cleaned);

  // Prefer the richer parse (e.g. PDF sin saltos de línea)
  if (fromFlat.length > fromLines.length) return fromFlat;
  if (fromLines.length > 0) return fromLines;
  return fromFlat;
}

function parseByLines(text: string): ParsedStudent[] {
  const results: ParsedStudent[] = [];
  const seen = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+/g, " ").trim();
    if (!line || line.length < 5) continue;
    if (HEADER_RE.test(line)) continue;

    const explicit = parseSeparatedLine(line);
    if (explicit) {
      addUnique(results, seen, explicit);
      continue;
    }

    const numbered = parseNumberedRow(line);
    if (numbered) {
      addUnique(results, seen, numbered);
      continue;
    }

    const withDni = parseLineWithEmbeddedDni(line);
    if (withDni) {
      addUnique(results, seen, withDni);
    }
  }

  return results;
}

/**
 * Detecta patrones repetidos tipo:
 * 1 Garcia, Ana 30041827 1013 2 Gonzalez, Juan 30041964 1060 ...
 * o sin DNI: 1 Garcia, Ana 1013 2 Gonzalez, Juan 30041964 1060
 */
function parseFlattenedRoster(text: string): ParsedStudent[] {
  const flat = text.replace(/\s+/g, " ").trim();
  const results: ParsedStudent[] = [];
  const seen = new Set<string>();

  const re =
    /\b(\d{1,3})\s+([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*)\s+(?:(\d{7,8})\s+)?(\d{4})\b/g;

  for (const match of flat.matchAll(re)) {
    const studentName = match[2].replace(/\s+/g, " ").trim();
    const dni = match[3] || match[4]; // prefer DNI; fallback matrícula
    if (!studentName || studentName.length < 3) continue;
    addUnique(results, seen, { studentName, studentDni: dni });
  }

  // Also: Name;DNI;Mat repeated without newlines
  if (results.length === 0) {
    const semi =
      /([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*)\s*;\s*(\d{4,8})/g;
    for (const match of flat.matchAll(semi)) {
      addUnique(results, seen, {
        studentName: match[1].trim(),
        studentDni: match[2],
      });
    }
  }

  return results;
}

/** "1 Garcia, Ana 30041827 1013" en una sola línea */
function parseNumberedRow(line: string): ParsedStudent | null {
  const m = line.match(
    /^\d{1,3}[.)]?\s+([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*)\s+(?:(\d{7,8})\s+)?(\d{4})\s*$/i,
  );
  if (!m) return null;
  return {
    studentName: m[1].replace(/\s+/g, " ").trim(),
    studentDni: m[2] || m[3],
  };
}

function addUnique(
  results: ParsedStudent[],
  seen: Set<string>,
  student: ParsedStudent,
) {
  if (seen.has(student.studentDni)) return;
  seen.add(student.studentDni);
  results.push(student);
}

function normalizeDni(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4 || digits.length > 8) return null;
  return digits;
}

function parseSeparatedLine(line: string): ParsedStudent | null {
  if (!/[;\t|]/.test(line) && !line.includes(",")) return null;

  const parts = line
    .split(/[;\t|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    const commaParts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      const last = commaParts[commaParts.length - 1];
      if (/^[\d.\-\s]+$/.test(last)) {
        const dni = normalizeDni(last);
        if (dni) {
          const studentName = commaParts.slice(0, -1).join(", ").trim();
          if (studentName.length >= 3) {
            return { studentName, studentDni: dni };
          }
        }
      }
    }
    return null;
  }

  // Prefer 7–8 digit DNI when both DNI and matrícula appear
  let dniIdx = parts.findIndex((p) => {
    const d = p.replace(/\D/g, "");
    return d.length >= 7 && d.length <= 8;
  });
  if (dniIdx === -1) {
    dniIdx = parts.findIndex((p) => normalizeDni(p));
  }
  if (dniIdx === -1) return null;

  const dni = normalizeDni(parts[dniIdx]);
  if (!dni) return null;

  const studentName = parts
    .filter((_, i) => i !== dniIdx)
    .filter((p) => {
      const d = p.replace(/\D/g, "");
      // drop leftover matricula-only cells from the name
      return !(d.length >= 4 && d.length <= 6 && d === p.replace(/\D/g, ""));
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (studentName.length < 3) return null;
  return { studentName, studentDni: dni };
}

function parseLineWithEmbeddedDni(line: string): ParsedStudent | null {
  const matches = [
    ...line.matchAll(/\b(\d{1,2}\.?\d{3}\.?\d{3}|\d{7,8})\b/g),
  ];
  if (matches.length === 0) return null;

  const best = matches.sort(
    (a, b) => b[1].replace(/\D/g, "").length - a[1].replace(/\D/g, "").length,
  )[0];

  const dni = normalizeDni(best[1]);
  if (!dni || dni.length < 7) return null;

  let name = line
    .replace(best[0], " ")
    .replace(/\b\d{4}\b/g, " ") // drop matrícula
    .replace(/[|;]+/g, " ")
    .replace(/^\d{1,3}\s*[.)\-:]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  name = name.replace(/^[,.\-–—]+|[,.\-–—]+$/g, "").trim();

  if (name.length < 3) return null;
  return { studentName: name, studentDni: dni };
}

export function studentsToBulkText(students: ParsedStudent[]): string {
  return students
    .map((s) => `${s.studentName};${s.studentDni}`)
    .join("\n");
}
