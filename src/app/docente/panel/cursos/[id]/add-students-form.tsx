"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input, TextArea } from "@/components/ui";

export function AddStudentsForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [bulk, setBulk] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDni, setStudentDni] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function addOne(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName, studentDni }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo agregar.");
        return;
      }
      setStudentName("");
      setStudentDni("");
      setMsg("Alumno agregado.");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function addBulk(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulk }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar.");
        return;
      }
      setBulk("");
      setMsg(`Se agregaron ${data.created} alumnos.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Padrón de alumnos">
      <form className="space-y-3" onSubmit={addOne}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Apellido y nombre">
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
              placeholder="Pérez, Ana"
            />
          </Field>
          <Field label="DNI / Legajo">
            <Input
              value={studentDni}
              onChange={(e) => setStudentDni(e.target.value)}
              required
              inputMode="numeric"
              placeholder="40123456"
            />
          </Field>
        </div>
        <Button type="submit" variant="secondary" disabled={loading}>
          Agregar uno
        </Button>
      </form>

      <form className="mt-5 space-y-3 border-t border-slate-100 pt-5" onSubmit={addBulk}>
        <Field
          label="Carga masiva"
          hint="Una línea por alumno: Nombre;DNI"
        >
          <TextArea
            rows={5}
            value={bulk}
            onChange={(e) => setBulk(e.target.value)}
            placeholder={"Gómez, Luis;30111222\nRuiz, María;33444555"}
          />
        </Field>
        <Button type="submit" disabled={loading || !bulk.trim()}>
          Cargar lista
        </Button>
      </form>

      {error ? <div className="mt-3"><Alert>{error}</Alert></div> : null}
      {msg ? (
        <div className="mt-3">
          <Alert tone="success">{msg}</Alert>
        </div>
      ) : null}
    </Card>
  );
}
