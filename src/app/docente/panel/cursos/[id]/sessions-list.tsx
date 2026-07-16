"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui";
import { classTypeBadgeTone } from "@/lib/class-types";
import {
  classTypeLabel,
  formatDate,
  formatTime,
  statusLabel,
} from "@/lib/utils";
import { SessionActions } from "./session-actions";

export type SessionItem = {
  id: string;
  classType: string;
  status: string;
  label: string | null;
  startsAt: string;
  endsAt: string;
  attendanceCount: number;
};

export function SessionsList({
  courseId,
  sessions,
}: {
  courseId: string;
  sessions: SessionItem[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allSelected = sessions.length > 0 && selected.size === sessions.length;
  const someSelected = selected.size > 0;

  const selectedLabel = useMemo(() => {
    if (selected.size === 1) return "1 seleccionada";
    return `${selected.size} seleccionadas`;
  }, [selected.size]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(sessions.map((s) => s.id)));
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    const n = selected.size;
    if (
      !confirm(
        `¿Eliminar ${n} clase${n === 1 ? "" : "s"} del calendario? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIds: [...selected] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudieron eliminar las clases.");
        return;
      }
      setSelected(new Set());
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (sessions.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Todavía no hay clases. Generá el calendario o agregá una sesión.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected && !allSelected;
            }}
            onChange={toggleAll}
            disabled={loading}
          />
          Seleccionar todas
        </label>
        {someSelected ? (
          <Button
            type="button"
            size="sm"
            variant="danger"
            disabled={loading}
            onClick={deleteSelected}
          >
            {loading ? "Eliminando…" : `Eliminar ${selectedLabel}`}
          </Button>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <ul className="divide-y divide-slate-100">
        {sessions.map((session) => {
          const checked = selected.has(session.id);
          return (
            <li
              key={session.id}
              className={`flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between ${
                checked ? "rounded-xl bg-teal-50/40 px-2 -mx-2" : ""
              }`}
            >
              <div className="flex min-w-0 flex-1 gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  checked={checked}
                  onChange={() => toggleOne(session.id)}
                  disabled={loading}
                  aria-label={`Seleccionar ${formatDate(session.startsAt)}`}
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">
                      {formatDate(session.startsAt)}
                    </span>
                    <Badge tone={classTypeBadgeTone(session.classType)}>
                      {classTypeLabel(session.classType)}
                    </Badge>
                    <Badge
                      tone={
                        session.status === "open"
                          ? "success"
                          : session.status === "closed"
                            ? "neutral"
                            : "warn"
                      }
                    >
                      {statusLabel(session.status)}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-500">
                    {formatTime(session.startsAt)} –{" "}
                    {formatTime(session.endsAt)}
                    {session.label ? ` · ${session.label}` : ""}
                    {" · "}
                    {session.attendanceCount} presentes
                  </p>
                </div>
              </div>
              <SessionActions
                sessionId={session.id}
                status={session.status}
                classType={session.classType}
                label={session.label}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
