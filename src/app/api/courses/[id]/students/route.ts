import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  // Confirmed list from OCR / preview
  if (Array.isArray(body.students)) {
    let created = 0;
    for (const item of body.students) {
      const studentName = String(item.studentName ?? "").trim();
      const studentDni = String(item.studentDni ?? "").replace(/\D/g, "");
      if (!studentName || studentDni.length < 7) continue;
      try {
        await prisma.enrollment.create({
          data: { courseId, studentName, studentDni },
        });
        created += 1;
      } catch {
        // skip duplicates
      }
    }
    return NextResponse.json({ created });
  }

  // Bulk paste: "Apellido Nombre;DNI" per line OR single student
  if (typeof body.bulk === "string" && body.bulk.trim()) {
    const { parseStudentListText } = await import("@/lib/parse-students");
    const parsed = parseStudentListText(String(body.bulk));
    let created = 0;
    for (const student of parsed) {
      try {
        await prisma.enrollment.create({
          data: {
            courseId,
            studentName: student.studentName,
            studentDni: student.studentDni,
          },
        });
        created += 1;
      } catch {
        // skip duplicates
      }
    }
    return NextResponse.json({ created });
  }

  const studentName = String(body.studentName ?? "").trim();
  const studentDni = String(body.studentDni ?? "").replace(/\D/g, "");

  if (!studentName || !studentDni) {
    return NextResponse.json(
      { error: "Nombre y DNI/legajo son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const student = await prisma.enrollment.create({
      data: { courseId, studentName, studentDni },
    });
    return NextResponse.json({ student });
  } catch {
    return NextResponse.json(
      { error: "Ese DNI/legajo ya está en el curso." },
      { status: 409 },
    );
  }
}
