import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AddStudentsForm } from "./add-students-form";
import { CalendarForm } from "./calendar-form";
import { SessionsList } from "./sessions-list";
import { RosterTable } from "./roster-table";

type Props = { params: Promise<{ id: string }> };

export default async function CoursePage({ params }: Props) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) redirect("/docente");

  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: { id, teacherId },
    include: {
      students: { orderBy: { studentName: "asc" } },
      sessions: {
        orderBy: { startsAt: "asc" },
        include: { _count: { select: { attendances: true } } },
      },
    },
  });

  if (!course) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <div className="space-y-2">
          <Link
            href="/docente/panel"
            className="text-sm text-teal-700 hover:underline"
          >
            ← Mis cursos
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-500">
            {[course.subject, course.commission].filter(Boolean).join(" · ") ||
              "Curso AsistAR"}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <AddStudentsForm courseId={course.id} />
          <CalendarForm courseId={course.id} />
        </div>

        <Card
          title={`Clases (${course.sessions.length})`}
          action={
            <span className="text-xs text-slate-500">
              {course.students.length} en padrón
            </span>
          }
        >
          {course.sessions.length === 0 ? (
            <p className="text-sm text-slate-600">
              Todavía no hay clases. Generá el calendario o agregá una sesión.
            </p>
          ) : (
            <SessionsList
              courseId={course.id}
              sessions={course.sessions.map((session) => ({
                id: session.id,
                classType: session.classType,
                status: session.status,
                label: session.label,
                startsAt: session.startsAt.toISOString(),
                endsAt: session.endsAt.toISOString(),
                attendanceCount: session._count.attendances,
              }))}
            />
          )}
        </Card>

        <Card title={`Padrón (${course.students.length})`}>
          {course.students.length === 0 ? (
            <p className="text-sm text-slate-600">
              Cargá alumnos con nombre, DNI y matrícula universitaria.
            </p>
          ) : (
            <RosterTable
              courseId={course.id}
              students={course.students.map((s) => ({
                id: s.id,
                studentName: s.studentName,
                studentDni: s.studentDni,
                matricula: s.matricula,
              }))}
            />
          )}
        </Card>
      </main>
    </div>
  );
}
