export type ParsedStudent = {
  studentName: string;
  studentDni: string;
  matricula?: string | null;
};

const HEADER_RE =
  /^(apellido|nombre|dni|legajo|alumno|documento|matricula|usar este|n[°ºo]\.?|orden|#)\b/i;

/**
 * Extrae alumnos (nombre + DNI + matrícula opcional) de texto pegado, OCR o PDF.
 */
export function parseStudentListText(text: string): ParsedStudent[] {
  const cleaned = text
    .replace(/\u00a0/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .trim();

  const fromLines = parseByLines(cleaned);
  const fromFlat = parseFlattenedRoster(cleaned);

  const preferred =
    fromFlat.length > fromLines.length ? fromFlat : fromLines.length > 0
      ? fromLines
      : fromFlat;

  return preferred.map(normalizeParsedStudent);
}

function normalizeParsedStudent(student: ParsedStudent): ParsedStudent {
  let studentName = student.studentName.replace(/\s+/g, " ").trim();
  let matricula = student.matricula?.replace(/\D/g, "") || null;

  // Si la matrícula quedó pegada al nombre: "Sosa, Lautaro 3034"
  const trailing = studentName.match(/^(.*\S)\s+(\d{4})$/);
  if (trailing && !matricula) {
    studentName = trailing[1].trim();
    matricula = trailing[2];
  } else if (trailing && matricula && trailing[2] === matricula) {
    studentName = trailing[1].trim();
  }

  return {
    studentName,
    studentDni: student.studentDni.replace(/\D/g, ""),
    matricula: matricula && matricula.length >= 4 ? matricula : null,
  };
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

function parseFlattenedRoster(text: string): ParsedStudent[] {
  const flat = text.replace(/\s+/g, " ").trim();
  const results: ParsedStudent[] = [];
  const seen = new Set<string>();

  const re =
    /\b(\d{1,3})\s+([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*)\s+(?:(\d{7,8})\s+)?(\d{4})\b/g;

  for (const match of flat.matchAll(re)) {
    const studentName = match[2].replace(/\s+/g, " ").trim();
    const dni = match[3] || match[4];
    // Si hay DNI de 7–8, el 4º grupo es matrícula; si no, el 4º es el ID
    const mat = match[3] ? match[4] : null;
    if (!studentName || studentName.length < 3) continue;
    addUnique(results, seen, {
      studentName,
      studentDni: dni,
      matricula: mat,
    });
  }

  if (results.length === 0) {
    const semi =
      /([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*)\s*;\s*(\d{4,8})(?:\s*;\s*(\d{4,8}))?/g;
    for (const match of flat.matchAll(semi)) {
      const a = match[2];
      const b = match[3];
      let studentDni = a;
      let matricula: string | null = null;
      if (b) {
        // Prefer longer as DNI
        if (a.length >= 7 && b.length <= 6) {
          studentDni = a;
          matricula = b;
        } else if (b.length >= 7 && a.length <= 6) {
          studentDni = b;
          matricula = a;
        } else {
          studentDni = a;
          matricula = b;
        }
      }
      addUnique(results, seen, {
        studentName: match[1].trim(),
        studentDni,
        matricula,
      });
    }
  }

  return results;
}

function parseNumberedRow(line: string): ParsedStudent | null {
  const m = line.match(
    /^\d{1,3}[.)]?\s+([A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*,\s*[A-Za-zÁÉÍÓÚÑÜáéíóúñü][A-Za-zÁÉÍÓÚÑÜáéíóúñü' .\-]*)\s+(?:(\d{7,8})\s+)?(\d{4})\s*$/i,
  );
  if (!m) return null;
  return {
    studentName: m[1].replace(/\s+/g, " ").trim(),
    studentDni: m[2] || m[3],
    matricula: m[2] ? m[3] : null,
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

  // CSV header-ish: apellido_nombre,dni,matricula
  if (/apellido|nombre/i.test(line) && /dni/i.test(line)) return null;

  const parts = line
    .split(/[;\t|]/)
    .map((p) => p.trim().replace(/^"|"$/g, ""))
    .filter(Boolean);

  // Also split CSV commas carefully when 3 columns
  if (parts.length < 2 && line.includes(",")) {
    const csvish = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    // "García, Ana",30041827,1013  is hard with comma in name — prefer semicolon files
    if (csvish.length === 3 && /^\d+$/.test(csvish[1]) && /^\d+$/.test(csvish[2])) {
      return {
        studentName: csvish[0],
        studentDni: csvish[1],
        matricula: csvish[2],
      };
    }
  }

  if (parts.length >= 2) {
    const numeric = parts.map((p, i) => ({
      i,
      digits: p.replace(/\D/g, ""),
      raw: p,
    }));

    const dniPart = numeric.find((p) => p.digits.length >= 7 && p.digits.length <= 8);
    const matPart = numeric.find(
      (p) =>
        p.digits.length >= 4 &&
        p.digits.length <= 6 &&
        (!dniPart || p.i !== dniPart.i),
    );

    if (dniPart) {
      const nameParts = parts.filter(
        (_, i) => i !== dniPart.i && (!matPart || i !== matPart.i),
      );
      const studentName = nameParts.join(" ").replace(/\s+/g, " ").trim();
      if (studentName.length >= 3) {
        return {
          studentName,
          studentDni: dniPart.digits,
          matricula: matPart?.digits ?? null,
        };
      }
    }

    // Name;matricula only
    if (!dniPart && parts.length >= 2) {
      const matOnly = numeric.find((p) => p.digits.length >= 4 && p.digits.length <= 6);
      if (matOnly) {
        const studentName = parts
          .filter((_, i) => i !== matOnly.i)
          .join(" ")
          .trim();
        if (studentName.length >= 3) {
          return {
            studentName,
            studentDni: matOnly.digits,
            matricula: matOnly.digits,
          };
        }
      }
    }
  }

  if (parts.length < 2) {
    const commaParts = line.split(",").map((p) => p.trim()).filter(Boolean);
    if (commaParts.length >= 2) {
      const last = commaParts[commaParts.length - 1];
      if (/^[\d.\-\s]+$/.test(last)) {
        const dni = normalizeDni(last);
        if (dni) {
          const studentName = commaParts.slice(0, -1).join(", ").trim();
          if (studentName.length >= 3) {
            return { studentName, studentDni: dni, matricula: null };
          }
        }
      }
    }
  }

  return null;
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
    .replace(/[|;]+/g, " ")
    .replace(/^\d{1,3}\s*[.)\-:]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  let matricula: string | null = null;
  const matMatch = name.match(/\b(\d{4})\b/);
  if (matMatch) {
    matricula = matMatch[1];
    name = name.replace(matMatch[0], " ").replace(/\s+/g, " ").trim();
  }

  name = name.replace(/^[,.\-–—]+|[,.\-–—]+$/g, "").trim();

  if (name.length < 3) return null;
  return { studentName: name, studentDni: dni, matricula };
}

export function studentsToBulkText(students: ParsedStudent[]): string {
  return students
    .map((s) =>
      s.matricula
        ? `${s.studentName};${s.studentDni};${s.matricula}`
        : `${s.studentName};${s.studentDni}`,
    )
    .join("\n");
}

/** Corrige nombres que tienen la matrícula pegada al final. */
export function splitNameAndMatricula(studentName: string, matricula?: string | null) {
  const trailing = studentName.trim().match(/^(.*\S)\s+(\d{4})$/);
  if (trailing) {
    return {
      studentName: trailing[1].trim(),
      matricula: matricula?.replace(/\D/g, "") || trailing[2],
    };
  }
  return {
    studentName: studentName.trim(),
    matricula: matricula?.replace(/\D/g, "") || null,
  };
}
