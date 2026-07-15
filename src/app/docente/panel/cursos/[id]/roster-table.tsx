"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui";

type Student = {
  id: string;
  studentName: string;
  studentDni: string;
  matricula: string | null;
};

type SortKey = "name" | "dni" | "matricula";

function surnameOf(fullName: string): string {
  const trimmed = fullName.trim();
  if (trimmed.includes(",")) return trimmed.split(",")[0].trim();
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function RosterTable({
  courseId,
  students,
}: {
  courseId: string;
  students: Student[];
}) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [fixing, setFixing] = useState(false);

  const filteredSorted = useMemo(() => {
    const collator = new Intl.Collator("es", { sensitivity: "base" });
    const q = query.trim().toLocaleLowerCase("es");

    let list = students;
    if (q.length > 0) {
      list = students.filter((s) => {
        const surname = surnameOf(s.studentName).toLocaleLowerCase("es");
        const full = s.studentName.toLocaleLowerCase("es");
        const mat = (s.matricula ?? "").toLowerCase();
        const dni = s.studentDni;
        // Desde 1 carácter filtra; con 3 letras suele alcanzar para el apellido
        return (
          surname.startsWith(q) ||
          full.includes(q) ||
          mat.includes(q) ||
          dni.includes(q)
        );
      });
    }

    const copy = [...list];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") {
        cmp = collator.compare(a.studentName, b.studentName);
      } else if (sortKey === "dni") {
        cmp = a.studentDni.localeCompare(b.studentDni, "es", { numeric: true });
      } else {
        cmp = (a.matricula ?? "").localeCompare(b.matricula ?? "", "es", {
          numeric: true,
        });
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [students, sortKey, sortDir, query]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function arrow(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  async function fixMatriculas() {
    setFixing(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fix_matriculas" }),
      });
      if (res.ok) router.refresh();
    } finally {
      setFixing(false);
    }
  }

  const needsFix = students.some((s) => /\s\d{4}$/.test(s.studentName.trim()));
  const missingMat = students.some((s) => !s.matricula);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700" htmlFor="roster-search">
          Buscar alumno
        </label>
        <Input
          id="roster-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Apellido o 3 primeras letras (ej. Aco, Ben, Sil…)"
          autoComplete="off"
        />
        <p className="text-xs text-slate-500">
          Escribí las primeras letras del apellido y se filtra al instante.
          {query.trim()
            ? ` Mostrando ${filteredSorted.length} de ${students.length}.`
            : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={sortKey === "name" ? "primary" : "secondary"}
          onClick={() => toggleSort("name")}
        >
          Orden A–Z{arrow("name")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sortKey === "dni" ? "primary" : "secondary"}
          onClick={() => toggleSort("dni")}
        >
          Por DNI{arrow("dni")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={sortKey === "matricula" ? "primary" : "secondary"}
          onClick={() => toggleSort("matricula")}
        >
          Por matrícula{arrow("matricula")}
        </Button>
        {needsFix ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={fixing}
            onClick={fixMatriculas}
          >
            {fixing ? "Corrigiendo…" : "Separar matrículas del nombre"}
          </Button>
        ) : null}
      </div>

      {missingMat ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Hay alumnos sin matrícula. Volvé a subir{" "}
          <strong>padron-50-asistar.txt</strong> (incluye DNI y matrícula
          ficticia) desde Carga masiva: se actualizarán los datos.
        </p>
      ) : null}

      <div className="max-h-80 overflow-auto rounded-xl border border-slate-100">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("name")}>
                  Nombre{arrow("name")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("dni")}>
                  DNI{arrow("dni")}
                </button>
              </th>
              <th className="px-3 py-2">
                <button type="button" onClick={() => toggleSort("matricula")}>
                  Matrícula{arrow("matricula")}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-slate-500" colSpan={3}>
                  Ningún alumno coincide con “{query}”.
                </td>
              </tr>
            ) : (
              filteredSorted.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{s.studentName}</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.studentDni}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {s.matricula || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
