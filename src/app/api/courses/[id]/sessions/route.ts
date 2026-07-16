import { NextResponse } from "next/server";
import {
  classTypeLabel,
  classTypeLimit,
  normalizeClassType,
} from "@/lib/class-types";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newQrToken } from "@/lib/utils";

type Params = { params: Promise<{ id: string }> };

async function assertClassTypeAllowed(
  courseId: string,
  classType: string,
  excludeSessionId?: string,
): Promise<string | null> {
  const limit = classTypeLimit(classType);
  if (limit == null) return null;

  const count = await prisma.classSession.count({
    where: {
      courseId,
      classType,
      ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
    },
  });

  if (count >= limit) {
    return `Ya hay ${count} ${classTypeLabel(classType).toLowerCase()}${count === 1 ? "" : "s"} (máximo ${limit}).`;
  }
  return null;
}

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

  if (body.generate) {
    const classType = normalizeClassType(body.classType);
    const startTime = String(body.startTime ?? "16:00");
    const endTime = String(body.endTime ?? "18:00");
    const fromDate = String(body.fromDate ?? "");
    const toDate = String(body.toDate ?? "");
    const label = String(body.label ?? "").trim() || null;

    let weekdays: number[] = [];
    if (Array.isArray(body.weekdays)) {
      weekdays = body.weekdays
        .map((d: unknown) => Number(d))
        .filter((d: number) => d >= 0 && d <= 6);
    } else if (body.weekday != null) {
      weekdays = [Number(body.weekday)];
    }
    weekdays = [...new Set(weekdays)];

    if (!fromDate || !toDate || weekdays.length === 0) {
      return NextResponse.json(
        { error: "Completá días, rango de fechas y horarios." },
        { status: 400 },
      );
    }

    // Estimate how many would be created for exam limits
    const limit = classTypeLimit(classType);
    if (limit != null) {
      const [sh, sm] = startTime.split(":").map(Number);
      const cursor = new Date(`${fromDate}T12:00:00`);
      const end = new Date(`${toDate}T12:00:00`);
      let wouldCreate = 0;
      while (cursor <= end) {
        if (weekdays.includes(cursor.getDay())) wouldCreate += 1;
        cursor.setDate(cursor.getDate() + 1);
      }
      const existing = await prisma.classSession.count({
        where: { courseId, classType },
      });
      if (existing + wouldCreate > limit) {
        return NextResponse.json(
          {
            error: `No se pueden generar ${wouldCreate} ${classTypeLabel(classType).toLowerCase()}s: el máximo es ${limit}. Usá “Una clase”.`,
          },
          { status: 400 },
        );
      }
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const cursor = new Date(`${fromDate}T12:00:00`);
    const end = new Date(`${toDate}T12:00:00`);
    const created = [];

    while (cursor <= end) {
      if (weekdays.includes(cursor.getDay())) {
        const startsAt = new Date(cursor);
        startsAt.setHours(sh, sm, 0, 0);
        const endsAt = new Date(cursor);
        endsAt.setHours(eh, em, 0, 0);

        const exists = await prisma.classSession.findFirst({
          where: { courseId, startsAt },
        });
        if (exists) {
          cursor.setDate(cursor.getDate() + 1);
          continue;
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
        created.push(session);
      }
      cursor.setDate(cursor.getDate() + 1);
    }

    return NextResponse.json({ created: created.length, sessions: created });
  }

  if (Array.isArray(body.sessions)) {
    let created = 0;
    for (const item of body.sessions) {
      const startsAt = new Date(item.startsAt);
      const endsAt = new Date(item.endsAt);
      if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
        continue;
      }
      const classType = normalizeClassType(item.classType);
      const limitError = await assertClassTypeAllowed(courseId, classType);
      if (limitError) {
        return NextResponse.json({ error: limitError, created }, { status: 400 });
      }
      const label = String(item.label ?? "").trim() || null;
      try {
        await prisma.classSession.create({
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
        created += 1;
      } catch {
        // ignore
      }
    }
    return NextResponse.json({ created });
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  const classType = normalizeClassType(body.classType);
  const label = String(body.label ?? "").trim() || null;

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json(
      { error: "Fechas u horarios inválidos." },
      { status: 400 },
    );
  }

  const limitError = await assertClassTypeAllowed(courseId, classType);
  if (limitError) {
    return NextResponse.json({ error: limitError }, { status: 400 });
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

export async function DELETE(request: Request, { params }: Params) {
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

  const body = await request.json().catch(() => ({}));
  const sessionIds = Array.isArray(body.sessionIds)
    ? body.sessionIds.map((id: unknown) => String(id)).filter(Boolean)
    : [];

  if (sessionIds.length === 0) {
    return NextResponse.json(
      { error: "No hay clases seleccionadas." },
      { status: 400 },
    );
  }

  const result = await prisma.classSession.deleteMany({
    where: {
      id: { in: sessionIds },
      courseId,
    },
  });

  return NextResponse.json({ deleted: result.count });
}
