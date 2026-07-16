import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Badge, Button, Card } from "@/components/ui";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LogoutButton } from "./logout-button";
import { NewCourseForm } from "./new-course-form";

export default async function PanelPage() {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) redirect("/docente");

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) redirect("/docente");

  const courses = await prisma.course.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { students: true, sessions: true } },
      sessions: {
        where: { status: "open" },
        take: 1,
      },
    },
  });

  return (
    <div className="min-h-screen bg-teal-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Hola, {teacher.name}
            </h1>
            <p className="text-sm text-slate-500">Panel docente AsistAR</p>
          </div>
          <LogoutButton />
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <NewCourseForm />
          </div>
          <div className="space-y-4 lg:col-span-3">
            <h2 className="text-lg font-semibold text-slate-900">Mis cursos</h2>
            {courses.length === 0 ? (
              <Card>
                <p className="text-sm text-slate-600">
                  Todavía no tenés cursos. Creá el primero a la izquierda (o
                  arriba en celular).
                </p>
              </Card>
            ) : (
              courses.map((course) => (
                <Card key={course.id} className="!p-4 sm:!p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {course.title}
                        </h3>
                        {course.sessions[0] ? (
                          <Badge tone="success">Clase abierta</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-slate-500">
                        {[course.subject, course.commission]
                          .filter(Boolean)
                          .join(" · ") || "Sin materia / comisión"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {course._count.students} alumnos ·{" "}
                        {course._count.sessions} clases
                      </p>
                    </div>
                    <Link href={`/docente/panel/cursos/${course.id}`}>
                      <Button>Abrir curso</Button>
                    </Link>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
