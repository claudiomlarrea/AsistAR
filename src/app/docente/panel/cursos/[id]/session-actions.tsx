"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Select } from "@/components/ui";

export function SessionActions({
  sessionId,
  status,
  classType,
  label,
}: {
  sessionId: string;
  status: string;
  classType: string;
  label: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(label ?? "");

  async function act(action: string, extra: Record<string, unknown> = {}) {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        if (action === "open") {
          window.location.href = `/docente/panel/sesiones/${sessionId}/qr`;
          return;
        }
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Select
          value={classType}
          disabled={loading}
          className="!w-auto min-w-[8rem]"
          onChange={(e) =>
            act("setType", { classType: e.target.value })
          }
        >
          <option value="theoretical">Teórica</option>
          <option value="practical">Práctica</option>
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

      {editingLabel ? (
        <div className="flex flex-wrap gap-2">
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            placeholder="Tema / docente"
            className="min-w-[12rem] flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm"
          />
          <Button
            size="sm"
            disabled={loading}
            onClick={async () => {
              await act("setLabel", { label: labelDraft });
              setEditingLabel(false);
            }}
          >
            Guardar
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setLabelDraft(label ?? "");
              setEditingLabel(false);
            }}
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <button
          type="button"
          className="text-left text-xs text-teal-700 hover:underline"
          onClick={() => setEditingLabel(true)}
        >
          {label ? `Tema: ${label} (editar)` : "+ Agregar tema / etiqueta"}
        </button>
      )}
    </div>
  );
}
