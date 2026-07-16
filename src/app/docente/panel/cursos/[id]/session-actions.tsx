"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Select } from "@/components/ui";
import { CLASS_TYPES, classTypeAllowsDocuments, classTypeAllowsTopic } from "@/lib/class-types";
import { SessionDocuments } from "./session-documents";

export function SessionActions({
  sessionId,
  status,
  classType,
  label,
  documentCount = 0,
}: {
  sessionId: string;
  status: string;
  classType: string;
  label: string | null;
  documentCount?: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [labelDraft, setLabelDraft] = useState(label ?? "");
  const [typeError, setTypeError] = useState("");

  useEffect(() => {
    setLabelDraft(label ?? "");
  }, [label]);

  const showTopic = classTypeAllowsTopic(classType);
  const showDocs = classTypeAllowsDocuments(classType);

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    setTypeError("");
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setTypeError(data.error || "No se pudo actualizar.");
        return;
      }
      if (action === "open") {
        window.location.href = `/docente/panel/sesiones/${sessionId}/qr`;
        return;
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:max-w-md sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Select
          value={classType}
          disabled={loading}
          className="!w-auto min-w-[11rem]"
          onChange={(e) => act("setType", { classType: e.target.value })}
        >
          {CLASS_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>

        {status === "open" ? (
          <>
            <Link href={`/docente/panel/sesiones/${sessionId}/qr`}>
              <Button size="sm">Ver QR</Button>
            </Link>
            <Button
              size="sm"
              variant="danger"
              disabled={loading}
              onClick={() => act("close")}
            >
              Cerrar
            </Button>
          </>
        ) : (
          <Button size="sm" disabled={loading} onClick={() => act("open")}>
            Abrir clase
          </Button>
        )}
        <a href={`/api/sessions/${sessionId}/excel`}>
          <Button size="sm" variant="secondary">
            Excel
          </Button>
        </a>
        <Button
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => {
            if (confirm("¿Eliminar esta clase del calendario?")) {
              act("delete");
            }
          }}
        >
          Borrar
        </Button>
      </div>

      {showTopic ? (
        <div className="flex w-full flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Tema</label>
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              if ((label ?? "") !== labelDraft.trim()) {
                act("setLabel", { label: labelDraft });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder="Tema de la clase…"
            className="min-w-[12rem] flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm outline-none ring-teal-500 focus:ring-2"
            disabled={loading}
          />
        </div>
      ) : (
        <div className="flex w-full flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">Detalle</label>
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => {
              if ((label ?? "") !== labelDraft.trim()) {
                act("setLabel", { label: labelDraft });
              }
            }}
            placeholder="Ej. 1º parcial presencial"
            className="min-w-[12rem] flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm outline-none ring-teal-500 focus:ring-2"
            disabled={loading}
          />
        </div>
      )}

      {typeError ? (
        <p className="text-xs text-red-600">{typeError}</p>
      ) : null}

      {showDocs ? (
        <SessionDocuments sessionId={sessionId} initialCount={documentCount} />
      ) : null}
    </div>
  );
}
