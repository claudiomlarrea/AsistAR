import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Badge, Button, Card } from "@/components/ui";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  classTypeLabel,
  formatDate,
  formatTime,
  statusLabel,
} from "@/lib/utils";
import { classTypeBadgeTone } from "@/lib/class-types";
import { AddStudentsForm } from "./add-students-form";
import { CalendarForm } from "./calendar-form";
import { SessionActions } from "./session-actions";
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
            <ul className="divide-y divide-slate-100">
              {course.sessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {formatDate(session.startsAt)}
                      </span>
                      <Badge tone={classTypeBadgeTone(session.classType)}>
                        {classTypeLabel(session.classType)}
                      </Badge>
                      <Badge
                        tone={
                          session.status === "open"
                            ? "success"
                            : session.status === "closed"
                              ? "neutral"
                              : "warn"
                        }
                      >
                        {statusLabel(session.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500">
                      {formatTime(session.startsAt)} –{" "}
                      {formatTime(session.endsAt)}
                      {session.label ? ` · ${session.label}` : ""}
                      {" · "}
                      {session._count.attendances} presentes
                    </p>
                  </div>
                  <SessionActions
                    sessionId={session.id}
                    status={session.status}
                    classType={session.classType}
                    label={session.label}
                  />
                </li>
              ))}
            </ul>
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
