import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button, Card } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-teal-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-sm font-medium text-teal-800">
              Hermano de EvaluAR · Asistencia presencial
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              AsistAR
            </h1>
            <p className="text-lg leading-8 text-slate-600">
              El docente calibra teóricas y prácticas, abre la clase y muestra un
              QR en el celular. Los alumnos escanean al ingresar. La asistencia
              se guarda y se descarga en Excel por clase.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/docente">
                <Button size="lg">Soy docente</Button>
              </Link>
              <Link href="/a">
                <Button size="lg" variant="secondary">
                  Soy alumno
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4">
            <Card title="Flujo en el aula">
              <ol className="space-y-3 text-sm text-slate-600">
                <li>1. El docente crea el curso y carga el padrón.</li>
                <li>2. Calibra fechas, horarios y tipo (teórica / práctica).</li>
                <li>3. En clase, abre la sesión: aparece un QR único.</li>
                <li>4. Cada alumno escanea y queda registrado.</li>
                <li>5. El docente cierra y descarga la planilla Excel.</li>
              </ol>
            </Card>
            <Card title="QR en el celular del docente">
              <p className="text-sm text-slate-600">
                La forma más simple: el docente deja un celular con la pantalla
                de QR a brillo máximo (en el escritorio o proyectado). No hace
                falta un segundo dispositivo especial; la app tiene modo
                presentación a pantalla completa.
              </p>
            </Card>
          </div>
        </div>

        <section className="mt-14 grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "Calendario calibrable",
              d: "Teóricas, prácticas, horarios y excepciones.",
            },
            {
              t: "QR por clase",
              d: "Cada sesión genera su propio código de ingreso.",
            },
            {
              t: "Excel por clase",
              d: "Descargá la planilla de esa sesión al cerrar.",
            },
          ].map((item) => (
            <Card key={item.t}>
              <h3 className="font-semibold text-slate-900">{item.t}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.d}</p>
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
