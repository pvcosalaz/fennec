export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "@/lib/notificationDb";
import { generateNotificationCopy } from "@/lib/notificationCopy";
import { sendPushToMany } from "@/lib/pushSend";

export async function POST(req: NextRequest) {
  // Require a valid Supabase Bearer token
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error: authErr } = await getSupabaseAdmin().auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { trackOwnerId, trackTitle, commenterUsername, firstTimestamp } = await req.json() as {
      trackOwnerId: string;
      trackTitle: string;
      commenterUsername: string;
      firstTimestamp?: string;
    };

    /* El texto bonito NO puede tumbar el aviso.
       Antes la generacion de copy vivia dentro del mismo try que el insert, asi
       que si la llamada a la IA fallaba o tardaba, el catch se llevaba todo y la
       notificacion NUNCA se creaba: un paso cosmetico matando el mensaje
       (Paco 2026-08-03, comento de una cuenta a otra y no llego nada).

       Ahora falla sola y cae a un texto llano. Un aviso feo llega; uno bonito
       que no existe, no. */
    let title = firstTimestamp
      ? `@${commenterUsername} left a note at ${firstTimestamp}`
      : `@${commenterUsername} left a note on your track`;
    try {
      const generado = await generateNotificationCopy({
        type: "audio_feedback",
        commenterUsername,
        trackTitle,
        firstTimestamp,
      });
      if (generado) title = generado;
    } catch (err) {
      console.error("[notifications/audio-feedback] copy failed, using plain title", err);
    }

    /* Cliente ADMIN: estamos en el servidor creando un aviso para OTRO usuario.
       Con el cliente anonimo, RLS rechazaba el insert y no llegaba nada. */
    const notification = await createNotification({
      userId: trackOwnerId,
      type: "audio_feedback",
      title,
      body: trackTitle,
      db: getSupabaseAdmin(),
    });

    /* El push va DESPUES y en su propio try: para este punto la notificacion ya
       esta guardada, y que el envio a un dispositivo falle no debe reportarse
       como si el aviso se hubiera perdido. */
    if (notification) {
      try {
        const subs = await fetchPushSubscriptionsForUser(trackOwnerId, getSupabaseAdmin());
        await sendPushToMany(subs, { title, type: "audio_feedback" }, (endpoint) =>
          deletePushSubscription(endpoint)
        );
      } catch (err) {
        console.error("[notifications/audio-feedback] push failed (la notificacion SI quedo guardada)", err);
      }
    } else {
      console.error("[notifications/audio-feedback] createNotification devolvio null", { trackOwnerId });
    }

    return NextResponse.json({ ok: true, notified: !!notification });
  } catch (err) {
    console.error("[notifications/audio-feedback]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
