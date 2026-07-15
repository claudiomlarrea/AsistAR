"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export default function DocenteAuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(
        mode === "login" ? "/api/auth/login" : "/api/auth/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, pin }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error de autenticación.");
        return;
      }
      router.push("/docente/panel");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-teal-50">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <Card title={mode === "login" ? "Ingreso docente" : "Crear cuenta"}>
          <form className="space-y-4" onSubmit={onSubmit}>
            {mode === "register" && (
              <Field label="Nombre">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  placeholder="Prof. García"
                />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="docente@universidad.edu"
              />
            </Field>
            <Field label="PIN (4+ dígitos)" hint="Como en EvaluAR: simple y usable en el aula.">
              <Input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                minLength={4}
                autoComplete="current-password"
                placeholder="••••"
              />
            </Field>
            {error ? <Alert>{error}</Alert> : null}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading
                ? "Esperá…"
                : mode === "login"
                  ? "Entrar al panel"
                  : "Crear cuenta"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-600">
            {mode === "login" ? (
              <>
                ¿Primera vez?{" "}
                <button
                  type="button"
                  className="font-medium text-teal-700"
                  onClick={() => setMode("register")}
                >
                  Crear cuenta
                </button>
              </>
            ) : (
              <>
                ¿Ya tenés cuenta?{" "}
                <button
                  type="button"
                  className="font-medium text-teal-700"
                  onClick={() => setMode("login")}
                >
                  Ingresar
                </button>
              </>
            )}
          </p>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            ← Volver al inicio
          </Link>
        </p>
      </main>
    </div>
  );
}
