"use client";

import { useEffect, useMemo, useState } from "react";
import { QrDisplay } from "@/components/qr-display";
import { Button } from "@/components/ui";

type Attendance = {
  id: string;
  studentName: string;
  studentDni: string;
  status: string;
  scannedAt: string;
};

export function QrLiveView({
  sessionId,
  initialToken,
  initialStatus,
  initialCount,
  enrolled,
  initialAttendances,
}: {
  sessionId: string;
  initialToken: string;
  initialStatus: string;
  initialCount: number;
  enrolled: number;
  initialAttendances: Attendance[];
}) {
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState(initialStatus);
  const [count, setCount] = useState(initialCount);
  const [attendances, setAttendances] = useState(initialAttendances);
  const [busy, setBusy] = useState(false);

  const scanUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return `/a/${token}`;
    }
    return `${window.location.origin}/a/${token}`;
  }, [token]);

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        setToken(data.session.qrToken);
        setStatus(data.session.status);
        setCount(data.session._count?.attendances ?? data.session.attendances?.length ?? 0);
        if (Array.isArray(data.session.attendances)) {
          setAttendances(
            data.session.attendances
              .slice()
              .reverse()
              .slice(0, 12)
              .map((a: Attendance & { scannedAt: string }) => ({
                ...a,
                scannedAt:
                  typeof a.scannedAt === "string"
                    ? a.scannedAt
                    : new Date(a.scannedAt).toISOString(),
              })),
          );
        }
      } catch {
        // ignore transient errors
      }
    }, 3000);
    return () => clearInterval(id);
  }, [sessionId]);

  async function act(action: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.session) {
        setToken(data.session.qrToken);
        setStatus(data.session.status);
        setCount(data.session._count?.attendances ?? count);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid flex-1 gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
      <div className="flex flex-col items-center rounded-3xl bg-white p-6 text-slate-900 shadow-xl sm:p-8">
        {status === "open" ? (
          <>
            <p className="mb-3 text-center text-sm font-medium text-teal-700">
              Escaneá para registrar asistencia
            </p>
            <QrDisplay value={scanUrl} size={280} className="max-w-full" />
            <p className="mt-4 break-all text-center font-mono text-[11px] text-slate-500">
              {scanUrl}
            </p>
            <p className="mt-2 text-center text-xs text-slate-400">
              Tip: brillo al máximo · dejá el celular en el escritorio o
              proyectá esta pantalla
            </p>
          </>
        ) : (
          <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 text-center">
            <p className="text-lg font-semibold">
              {status === "closed"
                ? "La clase está cerrada"
                : "La clase aún no está abierta"}
            </p>
            <Button size="lg" disabled={busy} onClick={() => act("open")}>
              Abrir asistencia ahora
            </Button>
          </div>
        )}

        <div className="mt-6 flex w-full flex-wrap justify-center gap-2">
          {status === "open" && (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => act("rotate")}
              >
                Rotar QR
              </Button>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => act("close")}
              >
                Cerrar clase
              </Button>
            </>
          )}
          <a href={`/api/sessions/${sessionId}/excel`}>
            <Button variant="secondary">Descargar Excel</Button>
          </a>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Presentes ahora</p>
          <p className="mt-1 text-4xl font-bold text-teal-300">
            {count}
            <span className="text-lg font-normal text-slate-500">
              {" "}
              / {enrolled || "—"}
            </span>
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-300">
            Últimos ingresos
          </h2>
          {attendances.length === 0 ? (
            <p className="text-sm text-slate-500">
              Todavía nadie escaneó. Cuando entren, aparecerán acá.
            </p>
          ) : (
            <ul className="space-y-2">
              {attendances.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-2 rounded-xl bg-slate-950/60 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{a.studentName}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {a.studentDni}
                    </p>
                  </div>
                  <span className="text-xs text-teal-300">
                    {a.status === "late" ? "Tarde" : "OK"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
