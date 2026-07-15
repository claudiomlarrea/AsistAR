"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export function NewCourseForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [commission, setCommission] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, subject, commission }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear.");
        return;
      }
      setTitle("");
      setSubject("");
      setCommission("");
      router.push(`/docente/panel/cursos/${data.course.id}`);
      router.refresh();
    } catch {
      setError("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Nuevo curso">
      <form className="space-y-3" onSubmit={onSubmit}>
        <Field label="Carrera">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Medicina"
          />
        </Field>
        <Field label="Materia">
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Anatomía I"
          />
        </Field>
        <Field label="Comisión (opcional)">
          <Input
            value={commission}
            onChange={(e) => setCommission(e.target.value)}
            placeholder="A / Turno mañana"
          />
        </Field>
        {error ? <Alert>{error}</Alert> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creando…" : "Crear curso"}
        </Button>
      </form>
    </Card>
  );
}
