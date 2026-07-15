"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Button, Card, Field, Input, Select } from "@/components/ui";
import { CLASS_TYPES, classTypeAllowsTopic } from "@/lib/class-types";

const WEEKDAYS = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export function CalendarForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"recurring" | "single">("recurring");
  const [classType, setClassType] = useState("theoretical");
  const [weekdays, setWeekdays] = useState<number[]>([1, 3]);
  const [startTime, setStartTime] = useState("16:00");
  const [endTime, setEndTime] = useState("18:00");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [label, setLabel] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showTopic = classTypeAllowsTopic(classType);
  const isExam = useMemo(
    () => classType.startsWith("exam_"),
    [classType],
  );

  function onTypeChange(value: string) {
    setClassType(value);
    if (value.startsWith("exam_")) {
      setMode("single");
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    try {
      if (mode === "recurring" && weekdays.length === 0) {
        setError("Elegí al menos un día de la semana.");
        return;
      }

      const body =
        mode === "recurring"
          ? {
              generate: true,
              classType,
              weekdays,
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
          ? `Se generaron ${data.created} clases. Completá el tema en cada teórica/práctica.`
          : "Fecha agregada.",
      );
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card title="Calibrar clases">
      <p className="mb-4 text-xs text-slate-500">
        Clases teóricas/prácticas: generá el calendario recurrente. Exámenes:
        usá <strong>Una clase</strong> (hasta 4 parciales, 2 recuperatorios y 1
        final).
      </p>

      <div className="mb-4 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "recurring" ? "primary" : "secondary"}
          onClick={() => setMode("recurring")}
          disabled={isExam}
        >
          Recurrente
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "single" ? "primary" : "secondary"}
          onClick={() => setMode("single")}
        >
          Una clase / examen
        </Button>
      </div>

      <form className="space-y-3" onSubmit={onSubmit}>
        <Field label="Tipo">
          <Select value={classType} onChange={(e) => onTypeChange(e.target.value)}>
            {CLASS_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
                {"max" in t && t.max ? ` (máx. ${t.max})` : ""}
              </option>
            ))}
          </Select>
        </Field>
        {showTopic ? (
          <Field label="Tema de la clase" hint="Se puede editar después en cada fecha">
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

        {mode === "recurring" ? (
          <>
            <Field label="Días de clase">
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map((d) => {
                  const active = weekdays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWeekday(d.value)}
                      className={`rounded-xl px-3 py-1.5 text-sm font-medium ${
                        active
                          ? "bg-teal-600 text-white"
                          : "border border-slate-300 bg-white text-slate-700"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
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
