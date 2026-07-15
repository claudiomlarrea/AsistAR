"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

type Student = {
  id: string;
  studentName: string;
  studentDni: string;
  matricula: string | null;
};

type SortKey = "name" | "dni" | "matricula";

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
  const [fixing, setFixing] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...students];
    const collator = new Intl.Collator("es", { sensitivity: "base" });
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
  }, [students, sortKey, sortDir]);

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

  return (
    <div className="space-y-3">
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
            {sorted.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{s.studentName}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.studentDni}</td>
                <td className="px-3 py-2 font-mono text-xs">
                  {s.matricula || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
