import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getValidAccessToken, upsertGcalEvent, deleteGcalEvent } from "@/lib/googleCalendar";

// Empuja (o retira) el espejo de UN evento del artista en Google Calendar.
// La identidad sale de la sesion, nunca del body — mismo guard que /events.
// Una via: Fennec -> Google. Editar en Google no regresa aqui.
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { action: "upsert"; gcalId?: string | null; title: string; day: string; description?: string }
    | { action: "delete"; gcalId: string }
    | null;
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const accessToken = await getValidAccessToken(user.id);
  /* Sin conexion no es un error: el sync es opcional por diseño. */
  if (!accessToken) return NextResponse.json({ connected: false });

  if (body.action === "delete") {
    await deleteGcalEvent(accessToken, body.gcalId);
    return NextResponse.json({ connected: true, ok: true });
  }

  if (!body.title || !/^\d{4}-\d{2}-\d{2}$/.test(body.day)) {
    return NextResponse.json({ error: "bad event" }, { status: 400 });
  }
  const gcalId = await upsertGcalEvent(accessToken, body);
  return NextResponse.json({ connected: true, ok: gcalId !== null, gcalId });
}
