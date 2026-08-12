export const runtime = "nodejs";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { savePushSubscription } from "@/lib/notificationDb";


export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { endpoint: string; keys: { p256dh: string; auth: string } };
    /* getSupabaseAdmin(), no el cliente por defecto: aqui no hay sesion de
       usuario, asi que RLS rechazaba el upsert y esta ruta llevaba devolviendo
       500 en produccion — ninguna suscripcion push se llego a guardar nunca
       (medido 2026-08-11). */
    await savePushSubscription({
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    }, getSupabaseAdmin());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe]", err);
    /* El codigo de Postgres viaja en la respuesta. El mensaje generico de antes
       obligaba a ir a los logs de Vercel para saber si era RLS, un esquema
       viejo o una FK — y por eso este fallo vivio tanto tiempo sin diagnostico.
       El codigo (42501, 23503...) no filtra datos y dice de que se trata. */
    const codigo = (err as { code?: string } | null)?.code;
    return NextResponse.json(
      { error: "Failed to save subscription", ...(codigo ? { code: codigo } : {}) },
      { status: 500 },
    );
  }
}
