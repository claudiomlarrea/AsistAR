import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { newQrToken } from "@/lib/utils";

type Params = { params: Promise<{ sessionId: string }> };

async function getOwnedSession(sessionId: string, teacherId: string) {
  return prisma.classSession.findFirst({
    where: { id: sessionId, course: { teacherId } },
    include: {
      course: true,
      attendances: { orderBy: { scannedAt: "asc" } },
      _count: { select: { attendances: true } },
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId } = await params;
  const session = await getOwnedSession(sessionId, teacherId);
  if (!session) {
    return NextResponse.json(
      { error: "Sesión no encontrada." },
      { status: 404 },
    );
  }

  const enrolled = await prisma.enrollment.count({
    where: { courseId: session.courseId },
  });

  return NextResponse.json({ session, enrolled });
}

export async function PATCH(request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId } = await params;
  const existing = await getOwnedSession(sessionId, teacherId);
  if (!existing) {
    return NextResponse.json(
      { error: "Sesión no encontrada." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const action = String(body.action ?? "");

  if (action === "open") {
    // Close any other open sessions in this course
    await prisma.classSession.updateMany({
      where: {
        courseId: existing.courseId,
        status: "open",
        id: { not: sessionId },
      },
      data: { status: "closed", closedAt: new Date() },
    });

    const session = await prisma.classSession.update({
      where: { id: sessionId },
      data: {
        status: "open",
        openedAt: new Date(),
        closedAt: null,
        qrToken: newQrToken(), // fresh token when opening
      },
      include: {
        course: true,
        attendances: { orderBy: { scannedAt: "asc" } },
        _count: { select: { attendances: true } },
      },
    });

    return NextResponse.json({ session });
  }

  if (action === "close") {
    const session = await prisma.classSession.update({
      where: { id: sessionId },
      data: { status: "closed", closedAt: new Date() },
      include: {
        course: true,
        attendances: { orderBy: { scannedAt: "asc" } },
        _count: { select: { attendances: true } },
      },
    });
    return NextResponse.json({ session });
  }

  if (action === "rotate") {
    if (existing.status !== "open") {
      return NextResponse.json(
        { error: "Solo se rota el QR con la clase abierta." },
        { status: 400 },
      );
    }
    const session = await prisma.classSession.update({
      where: { id: sessionId },
      data: { qrToken: newQrToken() },
      include: {
        course: true,
        attendances: { orderBy: { scannedAt: "asc" } },
        _count: { select: { attendances: true } },
      },
    });
    return NextResponse.json({ session });
  }

  if (action === "setType") {
    const classType =
      body.classType === "practical" ? "practical" : "theoretical";
    const session = await prisma.classSession.update({
      where: { id: sessionId },
      data: { classType },
      include: {
        course: true,
        attendances: { orderBy: { scannedAt: "asc" } },
        _count: { select: { attendances: true } },
      },
    });
    return NextResponse.json({ session });
  }

  if (action === "setLabel") {
    const label = String(body.label ?? "").trim() || null;
    const session = await prisma.classSession.update({
      where: { id: sessionId },
      data: { label },
      include: {
        course: true,
        attendances: { orderBy: { scannedAt: "asc" } },
        _count: { select: { attendances: true } },
      },
    });
    return NextResponse.json({ session });
  }

  if (action === "delete") {
    await prisma.classSession.delete({ where: { id: sessionId } });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Acción no válida." }, { status: 400 });
}
