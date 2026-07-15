import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

async function getOwnedCourse(courseId: string, teacherId: string) {
  return prisma.course.findFirst({
    where: { id: courseId, teacherId },
  });
}

export async function GET(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const course = await prisma.course.findFirst({
    where: { id, teacherId },
    include: {
      students: { orderBy: { studentName: "asc" } },
      sessions: { orderBy: { startsAt: "asc" } },
      _count: { select: { students: true, sessions: true } },
    },
  });

  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado." }, { status: 404 });
  }

  return NextResponse.json({ course });
}

export async function DELETE(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const course = await getOwnedCourse(id, teacherId);
  if (!course) {
    return NextResponse.json({ error: "Curso no encontrado." }, { status: 404 });
  }

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
