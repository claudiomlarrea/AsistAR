export type ParsedStudent = {
  studentName: string;
  studentDni: string;
};

const HEADER_RE =
  /^(apellido|nombre|dni|legajo|alumno|documento|n[°ºo]\.?|orden|#)\b/i;

/** Extrae alumnos (nombre + DNI/legajo) de un texto OCR o pegado. */
export function parseStudentListText(text: string): ParsedStudent[] {
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

    const withDni = parseLineWithEmbeddedDni(line);
    if (withDni) {
      addUnique(results, seen, withDni);
    }
  }

  return results;
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
  // DNI (7–8) o matrícula/legajo corto (4–6)
  if (digits.length < 4 || digits.length > 8) return null;
  return digits;
}

function parseSeparatedLine(line: string): ParsedStudent | null {
  if (!/[;\t|]/.test(line) && !line.includes(",")) return null;

  const parts = line
    .split(/[;\t|]/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Also try "Apellido, Nombre, 40123456" or last cell mostly numeric
  if (parts.length < 2) {
    const commaParts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      const last = commaParts[commaParts.length - 1];
      // Last fragment must be DNI-like, not "Ana 40123456"
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

  let dniIdx = parts.findIndex((p) => normalizeDni(p));
  if (dniIdx === -1) {
    // "Nombre;30111222 extra"
    dniIdx = parts.findIndex((p) => /\d{7,8}/.test(p.replace(/\D/g, "")));
  }
  if (dniIdx === -1) return null;

  const dni = normalizeDni(parts[dniIdx]);
  if (!dni) return null;

  const studentName = parts
    .filter((_, i) => i !== dniIdx)
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
  if (!dni) return null;

  let name = line
    .replace(best[0], " ")
    .replace(/[|;]+/g, " ")
    .replace(/^\d{1,3}\s*[.)\-:]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Clean leftover punctuation
  name = name.replace(/^[,.\-–—]+|[,.\-–—]+$/g, "").trim();

  if (name.length < 3) return null;
  return { studentName: name, studentDni: dni };
}

export function studentsToBulkText(students: ParsedStudent[]): string {
  return students
    .map((s) => `${s.studentName};${s.studentDni}`)
    .join("\n");
}
