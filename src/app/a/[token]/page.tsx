"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Alert, Badge, Button, Card, Field, Input } from "@/components/ui";
import { classTypeLabel, formatDateTime } from "@/lib/utils";

type SessionInfo = {
  id: string;
  status: string;
  classType: string;
  label: string | null;
  startsAt: string;
  endsAt: string;
  course: { title: string; subject: string | null; commission: string | null };
  presentCount: number;
};

export default function ScanAttendancePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loadError, setLoadError] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDni, setStudentDni] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/a/${token}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setLoadError(data.error || "Código inválido.");
          return;
        }
        if (!cancelled) setSession(data.session);
      } catch {
        if (!cancelled) setLoadError("No se pudo cargar la clase.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/a/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, studentDni }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo registrar.");
        return;
      }
      setMessage(data.message);
      setDone(true);
      try {
        localStorage.setItem(
          "asistar_student",
          JSON.stringify({ studentName, studentDni }),
        );
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem("asistar_student");
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        studentName?: string;
        studentDni?: string;
      };
      if (saved.studentName) setStudentName(saved.studentName);
      if (saved.studentDni) setStudentDni(saved.studentDni);
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-teal-100">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-8">
        {loadError ? (
          <Alert>{loadError}</Alert>
        ) : !session ? (
          <Card>
            <p className="text-sm text-slate-500">Cargando clase…</p>
          </Card>
        ) : (
          <Card>
            <div className="mb-4 space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge tone="teal">{classTypeLabel(session.classType)}</Badge>
                <Badge
                  tone={
                    session.status === "open"
                      ? "success"
                      : session.status === "closed"
                        ? "neutral"
                        : "warn"
                  }
                >
                  {session.status === "open"
                    ? "Abierta"
                    : session.status === "closed"
                      ? "Cerrada"
                      : "Aún no abierta"}
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                {session.course.title}
              </h1>
              <p className="text-sm text-slate-500">
                {formatDateTime(session.startsAt)}
                {session.label ? ` · ${session.label}` : ""}
              </p>
            </div>

            {done ? (
              <Alert tone="success">{message}</Alert>
            ) : (
              <form className="space-y-4" onSubmit={onSubmit}>
                <Field label="Apellido y nombre">
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </Field>
                <Field label="DNI / Legajo">
                  <Input
                    value={studentDni}
                    onChange={(e) => setStudentDni(e.target.value)}
                    required
                    inputMode="numeric"
                    autoComplete="off"
                  />
                </Field>
                {error ? <Alert>{error}</Alert> : null}
                {session.status !== "open" ? (
                  <Alert tone="info">
                    Esperá a que el docente abra la toma de asistencia.
                  </Alert>
                ) : null}
                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={loading || session.status !== "open"}
                >
                  {loading ? "Registrando…" : "Confirmar asistencia"}
                </Button>
              </form>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
