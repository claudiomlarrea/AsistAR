"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { CLASS_TYPES, classTypeAllowsTopic } from "@/lib/class-types";

export function CalendarForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [classType, setClassType] = useState("theoretical");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showTopic = classTypeAllowsTopic(classType);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      if (!date || !startTime || !endTime) {
        setError("Indicá fecha, inicio y fin.");
        return;
      }

      const startsAt = `${date}T${startTime}`;
      const endsAt = `${date}T${endTime}`;

      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classType,
          label,
          startsAt,
          endsAt,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear.");
        return;
      }
      setMsg("Fecha agregada. Podés cargar la siguiente.");
      setLabel("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Calibrar clases">
      <p className="mb-4 text-xs text-slate-500">
        Agregá una fecha por vez: teórica, práctica, parcial (máx. 4),
        recuperatorio (máx. 2) o final (máx. 1). En teórica/práctica podés cargar
        el tema.
      </p>

      <form className="space-y-3" onSubmit={onSubmit}>
        <Field label="Tipo">
          <Select
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
          >
            {CLASS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {"max" in t && t.max ? ` (máx. ${t.max})` : ""}
              </option>
            ))}
          </Select>
        </Field>

        {showTopic ? (
          <Field label="Tema de la clase" hint="También se edita después en la lista">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. Inflamación · mecanismos TH1"
            />
          </Field>
        ) : (
          <Field label="Detalle del examen (opcional)">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej. 1º parcial presencial"
            />
          </Field>
        )}

        <Field label="Fecha">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Inicio">
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </Field>
          <Field label="Fin">
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </Field>
        </div>

        {error ? <Alert>{error}</Alert> : null}
        {msg ? <Alert tone="success">{msg}</Alert> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Agregando…" : "Agregar esta fecha"}
        </Button>
      </form>
    </Card>
  );
}
