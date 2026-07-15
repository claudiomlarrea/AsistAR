"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";

export function CalendarForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"recurring" | "single">("recurring");
  const [classType, setClassType] = useState("theoretical");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      const body =
        mode === "recurring"
          ? {
              generate: true,
              classType,
              weekday: Number(weekday),
              startTime,
              endTime,
              fromDate,
              toDate,
              label,
            }
          : {
              classType,
              label,
              startsAt,
              endsAt,
            };

      const res = await fetch(`/api/courses/${courseId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo crear.");
        return;
      }
      setMsg(
        mode === "recurring"
          ? `Se generaron ${data.created} clases.`
          : "Clase agregada.",
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Calibrar clases">
      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "recurring" ? "primary" : "secondary"}
          onClick={() => setMode("recurring")}
        >
          Recurrente
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "single" ? "primary" : "secondary"}
          onClick={() => setMode("single")}
        >
          Una clase
        </Button>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <Field label="Tipo">
          <Select
            value={classType}
            onChange={(e) => setClassType(e.target.value)}
          >
            <option value="theoretical">Teórica</option>
            <option value="practical">Práctica</option>
          </Select>
        </Field>
        <Field label="Etiqueta (opcional)">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Aula 3 / Lab 2"
          />
        </Field>

        {mode === "recurring" ? (
          <>
            <Field label="Día de la semana">
              <Select
                value={weekday}
                onChange={(e) => setWeekday(e.target.value)}
              >
                <option value="1">Lunes</option>
                <option value="2">Martes</option>
                <option value="3">Miércoles</option>
                <option value="4">Jueves</option>
                <option value="5">Viernes</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde">
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  required
                />
              </Field>
              <Field label="Hasta">
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                />
              </Field>
            </div>
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
          </>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Inicio">
              <Input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </Field>
            <Field label="Fin">
              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                required
              />
            </Field>
          </div>
        )}

        {error ? <Alert>{error}</Alert> : null}
        {msg ? <Alert tone="success">{msg}</Alert> : null}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading
            ? "Generando…"
            : mode === "recurring"
              ? "Generar calendario"
              : "Agregar clase"}
        </Button>
      </form>
    </Card>
  );
}
