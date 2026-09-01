// lib/publicRateLimit.ts — freno para rutas PUBLICAS (sin sesion).
//
// Auditoria 2026-08-31: /api/waitlist/* no tenia limite y la de welcome manda
// correo con Resend. El contador vive en Postgres (consume_public_quota) y no
// en memoria, porque en serverless cada instancia tendria su propio Map y el
// limite seria una ilusion.
//
// Filosofia de fusible, la misma de lab-idea: si la BD falla, se DEJA PASAR y
// se registra. Un fusible roto que bloquea a todos es peor que uno abierto.

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** La IP real detras del proxy de Vercel. Sin cabecera, todos caen en el
 *  mismo cubo "desconocido", que es el comportamiento seguro: si no se puede
 *  distinguir a nadie, se limita al conjunto. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "desconocido";
}

/**
 * ¿Cabe este intento dentro del limite?
 * @param accion  etiqueta del cubo, p.ej. "waitlist_welcome"
 * @param limit   intentos permitidos por ventana y por IP
 * @param windowMinutes  tamaño de la ventana (default 60)
 */
export async function allowPublic(
  accion: string,
  req: Request,
  limit: number,
  windowMinutes = 60,
): Promise<boolean> {
  try {
    const { data, error } = await getSupabaseAdmin().rpc("consume_public_quota", {
      p_bucket: `${accion}:${clientIp(req)}`,
      p_limit: limit,
      p_window_minutes: windowMinutes,
    });
    if (error) {
      console.error(`[rate-limit] ${accion}: la BD fallo, se deja pasar:`, error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error(`[rate-limit] ${accion}: excepcion, se deja pasar:`, e);
    return true;
  }
}
