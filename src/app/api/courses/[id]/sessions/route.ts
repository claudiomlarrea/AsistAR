import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newQrToken } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id: courseId } = await params;
  const course = await prisma.course.findFirst({
    where: { id: courseId, teacherId },
  });
  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado." }, { status: 404 });
  }

  const body = await request.json();

  // Generate recurring calendar
  if (body.generate) {
    const classType = body.classType === "practical" ? "practical" : "theoretical";
    const weekday = Number(body.weekday); // 0=Sun ... 6=Sat
    const startTime = String(body.startTime ?? "10:00");
    const endTime = String(body.endTime ?? "12:00");
    const fromDate = String(body.fromDate ?? "");
    const toDate = String(body.toDate ?? "");
    const label = String(body.label ?? "").trim() || null;

    if (
      Number.isNaN(weekday) ||
      weekday < 0 ||
      weekday > 6 ||
      !fromDate ||
      !toDate
    ) {
      return NextResponse.json(
        { error: "Completá día, rango de fechas y horarios." },
        { status: 400 },
      );
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const cursor = new Date(`${fromDate}T12:00:00`);
    const end = new Date(`${toDate}T12:00:00`);
    const created = [];

    while (cursor <= end) {
      if (cursor.getDay() === weekday) {
        const startsAt = new Date(cursor);
        startsAt.setHours(sh, sm, 0, 0);
        const endsAt = new Date(cursor);
        endsAt.setHours(eh, em, 0, 0);

        const session = await prisma.classSession.create({
          data: {
            courseId,
            classType,
            label,
            startsAt,
            endsAt,
            qrToken: newQrToken(),
            status: "scheduled",
          },
        });
        created.push(session);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({ created: created.length, sessions: created });
  }

  // Single session
  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  const classType = body.classType === "practical" ? "practical" : "theoretical";
  const label = String(body.label ?? "").trim() || null;

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json(
      { error: "Fechas u horarios inválidos." },
      { status: 400 },
    );
  }

  const session = await prisma.classSession.create({
    data: {
      courseId,
      classType,
      label,
      startsAt,
      endsAt,
      qrToken: newQrToken(),
      status: "scheduled",
    },
  });

  return NextResponse.json({ session });
}
