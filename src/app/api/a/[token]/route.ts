import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { minutesBetween } from "@/lib/utils";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const session = await prisma.classSession.findUnique({
    where: { qrToken: token },
    include: {
      course: { select: { title: true, subject: true, commission: true } },
      _count: { select: { attendances: true } },
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Código QR no válido o expirado." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    session: {
      id: session.id,
      status: session.status,
      classType: session.classType,
      label: session.label,
      startsAt: session.startsAt,
      endsAt: session.endsAt,
      course: session.course,
      presentCount: session._count.attendances,
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const session = await prisma.classSession.findUnique({
    where: { qrToken: token },
    include: { course: true },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Código QR no válido o expirado." },
      { status: 404 },
    );
  }

  if (session.status !== "open") {
    return NextResponse.json(
      {
        error:
          session.status === "closed"
            ? "La toma de asistencia ya está cerrada."
            : "El docente todavía no abrió esta clase.",
      },
      { status: 403 },
    );
  }

  const body = await request.json();
  const studentName = String(body.studentName ?? "").trim();
  const studentDni = String(body.studentDni ?? "").replace(/\D/g, "");

  if (!studentName || !studentDni) {
    return NextResponse.json(
      { error: "Completá nombre y DNI/legajo." },
      { status: 400 },
    );
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      courseId_studentDni: {
        courseId: session.courseId,
        studentDni,
      },
    },
  });

  const existing = await prisma.attendanceRecord.findUnique({
    where: {
      sessionId_studentDni: {
        sessionId: session.id,
        studentDni,
      },
    },
  });

  if (existing) {
    return NextResponse.json({
      already: true,
      record: existing,
      message: "Ya estabas registrado en esta clase.",
    });
  }

  const now = new Date();
  const lateThreshold = 15; // minutes after start
  const mins = minutesBetween(session.startsAt, now);
  const status = mins > lateThreshold ? "late" : "present";

  const record = await prisma.attendanceRecord.create({
    data: {
      sessionId: session.id,
      studentDni,
      studentName: enrollment?.studentName ?? studentName,
      status,
    },
  });

  return NextResponse.json({
    already: false,
    record,
    message:
      status === "late"
        ? "Asistencia registrada (llegada tarde)."
        : "Asistencia registrada correctamente.",
    course: session.course.title,
  });
}
