import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-lg font-bold text-white">
            A
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">AsistAR</p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Asistencia por QR. Planilla lista.
            </p>
          </div>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/a"
            className="rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-100 sm:px-3"
          >
            Soy alumno
          </Link>
          <Link
            href="/docente"
            className="rounded-lg px-2 py-2 text-slate-600 hover:bg-slate-100 sm:px-3"
          >
            Docente
          </Link>
          <Link
            href="/docente/panel"
            className="rounded-lg bg-teal-600 px-3 py-2 font-medium text-white hover:bg-teal-700 sm:px-4"
          >
            Panel
          </Link>
        </nav>
      </div>
    </header>
  );
}
