import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classTypeLabel, formatDateTime } from "@/lib/utils";
import { QrLiveView } from "./qr-live-view";

type Props = { params: Promise<{ sessionId: string }> };

export default async function QrPage({ params }: Props) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) redirect("/docente");

  const { sessionId } = await params;
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, course: { teacherId } },
    include: {
      course: true,
      attendances: { orderBy: { scannedAt: "desc" }, take: 12 },
      _count: { select: { attendances: true } },
    },
  });

  if (!session) notFound();

  const enrolled = await prisma.enrollment.count({
    where: { courseId: session.courseId },
  });

  return (
    <div className="qr-stage bg-slate-950 text-white">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 py-4 sm:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-teal-300">
              AsistAR · Modo presentación
            </p>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {session.course.title}
            </h1>
            <p className="text-sm text-slate-300">
              {classTypeLabel(session.classType)} ·{" "}
              {formatDateTime(session.startsAt)}
              {session.label ? ` · ${session.label}` : ""}
            </p>
          </div>
          <Link
            href={`/docente/panel/cursos/${session.courseId}`}
            className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Volver al curso
          </Link>
        </div>

        <QrLiveView
          sessionId={session.id}
          initialToken={session.qrToken}
          initialStatus={session.status}
          initialCount={session._count.attendances}
          enrolled={enrolled}
          initialAttendances={session.attendances.map((a) => ({
            id: a.id,
            studentName: a.studentName,
            studentDni: a.studentDni,
            status: a.status,
            scannedAt: a.scannedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
