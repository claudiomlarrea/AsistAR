"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Alert, Button, Card, Field, Input } from "@/components/ui";

export default function AlumnoManualPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = token.trim().toUpperCase();
    if (!clean) {
      setError("Ingresá el código de la clase.");
      return;
    }
    router.push(`/a/${clean}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-teal-100">
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <Card title="Soy alumno">
          <p className="mb-4 text-sm text-slate-600">
            Lo más fácil es escanear el QR que muestra el docente. Si no podés
            usar la cámara, escribí el código de la clase.
          </p>
          <form className="space-y-4" onSubmit={onSubmit}>
            <Field label="Código de la clase">
              <Input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Ej. AB12CD34EF"
                autoCapitalize="characters"
                className="font-mono tracking-wider uppercase"
              />
            </Field>
            {error ? <Alert>{error}</Alert> : null}
            <Button type="submit" className="w-full" size="lg">
              Continuar
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
