import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { splitNameAndMatricula } from "@/lib/parse-students";

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
      const rawName = String(item.studentName ?? "").trim();
      const studentDni = String(item.studentDni ?? "").replace(/\D/g, "");
      const split = splitNameAndMatricula(
        rawName,
        item.matricula != null ? String(item.matricula) : null,
      );
      if (!split.studentName || studentDni.length < 4) continue;
      try {
        await prisma.enrollment.create({
          data: {
            courseId,
            studentName: split.studentName,
            studentDni,
            matricula: split.matricula,
          },
        });
        created += 1;
      } catch {
        // update existing with matricula if duplicate DNI
        await prisma.enrollment.updateMany({
          where: { courseId, studentDni },
          data: {
            studentName: split.studentName,
            matricula: split.matricula,
          },
        });
      }
    }
    return NextResponse.json({ created });
  }

  // Bulk paste
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
            matricula: student.matricula ?? null,
          },
        });
        created += 1;
      } catch {
        await prisma.enrollment.updateMany({
          where: { courseId, studentDni: student.studentDni },
          data: {
            studentName: student.studentName,
            matricula: student.matricula ?? null,
          },
        });
      }
    }
    return NextResponse.json({ created });
  }

  // Fix names that already have matricula glued on
  if (body.action === "fix_matriculas") {
    const students = await prisma.enrollment.findMany({ where: { courseId } });
    let fixed = 0;
    for (const s of students) {
      const split = splitNameAndMatricula(s.studentName, s.matricula);
      if (
        split.studentName !== s.studentName ||
        (split.matricula && split.matricula !== s.matricula)
      ) {
        await prisma.enrollment.update({
          where: { id: s.id },
          data: {
            studentName: split.studentName,
            matricula: split.matricula,
          },
        });
        fixed += 1;
      }
    }
    return NextResponse.json({ fixed });
  }

  const studentName = String(body.studentName ?? "").trim();
  const studentDni = String(body.studentDni ?? "").replace(/\D/g, "");
  const matriculaRaw = String(body.matricula ?? "").replace(/\D/g, "");
  const split = splitNameAndMatricula(studentName, matriculaRaw || null);

  if (!split.studentName || !studentDni) {
    return NextResponse.json(
      { error: "Nombre y DNI/legajo son obligatorios." },
      { status: 400 },
    );
  }

  try {
    const student = await prisma.enrollment.create({
      data: {
        courseId,
        studentName: split.studentName,
        studentDni,
        matricula: split.matricula,
      },
    });
    return NextResponse.json({ student });
  } catch {
    return NextResponse.json(
      { error: "Ese DNI/legajo ya está en el curso." },
      { status: 409 },
    );
  }
}
