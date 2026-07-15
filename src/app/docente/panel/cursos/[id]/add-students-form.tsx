"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input, TextArea } from "@/components/ui";
import {
  extractStudentsFromFileText,
  extractTextFromFile,
} from "@/lib/extract-roster";
import type { ParsedStudent } from "@/lib/parse-students";
import { studentsToBulkText } from "@/lib/parse-students";

export function AddStudentsForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [bulk, setBulk] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDni, setStudentDni] = useState("");
  const [preview, setPreview] = useState<ParsedStudent[]>([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

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
      setPreview([]);
      setMsg(`Se agregaron ${data.created} alumnos.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function confirmPreview() {
    if (preview.length === 0) return;
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const res = await fetch(`/api/courses/${courseId}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: preview }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cargar.");
        return;
      }
      setPreview([]);
      setBulk("");
      if (fileRef.current) fileRef.current.value = "";
      setMsg(`Se agregaron ${data.created} alumnos al padrón.`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onFileSelected(file: File | null) {
    if (!file) return;
    setScanning(true);
    setError("");
    setMsg("");
    setPreview([]);
    try {
      const text = await extractTextFromFile(file);
      const students = extractStudentsFromFileText(text);
      if (students.length === 0) {
        setError(
          "No pude detectar alumnos. Probá con una foto más nítida, o pegá la lista como Nombre;DNI.",
        );
        setBulk(text.slice(0, 2000));
        return;
      }
      setPreview(students);
      setBulk(studentsToBulkText(students));
      setMsg(
        `Detecté ${students.length} alumno${students.length === 1 ? "" : "s"}. Revisá la vista previa y confirmá.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo leer el archivo.",
      );
    } finally {
      setScanning(false);
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

      <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
        <Field
          label="Carga masiva"
          hint="Subí un PDF, una foto del listado, Excel (.xlsx) o CSV. También podés pegar texto: Nombre;DNI"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.csv,.txt,image/*,application/pdf"
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-800 hover:file:bg-teal-100"
            disabled={scanning || loading}
            onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
          />
        </Field>

        {scanning ? (
          <Alert tone="info">
            Leyendo listado… (OCR puede tardar 10–30 s en fotos)
          </Alert>
        ) : null}

        {preview.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-teal-100 bg-teal-50/50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">
                Vista previa · {preview.length} alumnos
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => {
                    setPreview([]);
                    setBulk("");
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  Descartar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={loading}
                  onClick={confirmPreview}
                >
                  Confirmar carga
                </Button>
              </div>
            </div>
            <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-2 py-1.5">Nombre</th>
                    <th className="px-2 py-1.5">DNI</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((s) => (
                    <tr key={s.studentDni} className="border-t border-slate-100">
                      <td className="px-2 py-1.5">{s.studentName}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">
                        {s.studentDni}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <form className="space-y-3" onSubmit={addBulk}>
          <Field label="O pegá / editá la lista" hint="Una línea por alumno: Nombre;DNI">
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
      </div>

      {error ? (
        <div className="mt-3">
          <Alert>{error}</Alert>
        </div>
      ) : null}
      {msg ? (
        <div className="mt-3">
          <Alert tone="success">{msg}</Alert>
        </div>
      ) : null}
    </Card>
  );
}
