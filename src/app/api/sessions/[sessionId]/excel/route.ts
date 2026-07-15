import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getTeacherIdFromSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classTypeLabel, formatDateTime } from "@/lib/utils";

type Params = { params: Promise<{ sessionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const teacherId = await getTeacherIdFromSession();
  if (!teacherId) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { sessionId } = await params;
  const session = await prisma.classSession.findFirst({
    where: { id: sessionId, course: { teacherId } },
    include: {
      course: true,
      attendances: { orderBy: { studentName: "asc" } },
    },
  });

  if (!session) {
    return NextResponse.json(
      { error: "Sesión no encontrada." },
      { status: 404 },
    );
  }

  const enrolled = await prisma.enrollment.findMany({
    where: { courseId: session.courseId },
    orderBy: { studentName: "asc" },
  });

  const presentByDni = new Map(
    session.attendances.map((a) => [a.studentDni, a]),
  );

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AsistAR";
  const sheet = workbook.addWorksheet("Asistencia");

  sheet.columns = [
    { header: "DNI", key: "dni", width: 14 },
    { header: "Matrícula", key: "matricula", width: 12 },
    { header: "Apellido y nombre", key: "name", width: 32 },
    { header: "Estado", key: "status", width: 12 },
    { header: "Hora de ingreso", key: "time", width: 22 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const student of enrolled) {
    const record = presentByDni.get(student.studentDni);
    sheet.addRow({
      dni: student.studentDni,
      matricula: student.matricula ?? "",
      name: student.studentName,
      status: record
        ? record.status === "late"
          ? "Tarde"
          : "Presente"
        : "Ausente",
      time: record ? formatDateTime(record.scannedAt) : "",
    });
  }

  // Also include walk-ins not in padrol
  for (const a of session.attendances) {
    if (!enrolled.some((e) => e.studentDni === a.studentDni)) {
      sheet.addRow({
        dni: a.studentDni,
        name: a.studentName,
        status: a.status === "late" ? "Tarde" : "Presente",
        time: formatDateTime(a.scannedAt),
      });
    }
  }

  const meta = workbook.addWorksheet("Clase");
  meta.addRows([
    ["Carrera", session.course.title],
    ["Materia", session.course.subject ?? ""],
    ["Comisión", session.course.commission ?? ""],
    ["Tipo", classTypeLabel(session.classType)],
    ["Etiqueta", session.label ?? ""],
    ["Inicio", formatDateTime(session.startsAt)],
    ["Fin", formatDateTime(session.endsAt)],
    ["Estado", session.status],
    ["Presentes", session.attendances.length],
    ["En padrón", enrolled.length],
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  const safeTitle = session.course.title.replace(/[^\w\-]+/g, "_").slice(0, 40);
  const datePart = session.startsAt.toISOString().slice(0, 10);
  const filename = `AsistAR_${safeTitle}_${datePart}.xlsx`;

  return new NextResponse(Buffer.from(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
