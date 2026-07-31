# Spec · Modo Artista (Business Hub consciente del rol)

> Diseño acordado en office-hours con Paco (2026-07-18). Aprobó el enfoque **B**:
> construir un módulo de negocio real para artistas, no solo re-etiquetar el de
> productor. Este doc es el spec, no código.

---

## 1. Decisión y por qué

**Contexto.** Fennec hoy sirve a productores/compositores. En la mini-campaña de
prospección salieron comentarios de "háganlo también para artistas". Eso es
*interés*, no *demanda validada*. Pero el costo marginal es bajo y el mercado de
artistas es más grande que el de productores, así que la apuesta es de escalabilidad.

**Insight clave (Paco).** El universo es el mismo, pero el eje cambia:
- Productor → el Business responde *"¿cuánto estoy ganando?"* (clientes, revenue).
- Artista → responde *"¿cómo va mi carrera?"*. **La reputación y el momentum pegan
  más fuerte que la lana pura.** El número norte del módulo se inclina a tracción
  (streams, saves, colaboraciones), no a "revenue este mes".

**Arquitectura.** No son dos apps. Un tipo de cuenta primario **Artista vs
Productor** intercambia SOLO el módulo 1 (Business Hub). Todo lo demás queda
compartido: Cinta, Community, dB, Fennec ID, Content Lab. Así productores y
artistas conviven en la misma comunidad y se conectan (la herramienta de Splits
es el puente).

## 2. El gate de rol (onboarding)

- Hoy `role` es un dropdown libre en Settings ([`SettingsModule.tsx:51`](../components/settings/SettingsModule.tsx))
  con "Music Producer, Composer, Beatmaker, Mix Engineer...".
- **Nuevo:** un nivel arriba, un `account_type: 'artist' | 'producer'` (primario)
  que se pregunta al inicio (primer run / signup) y prende el Business Hub correcto.
- El dropdown detallado de `role` se queda debajo, como sub-especialidad.
- Debe ser editable después en Settings (alguien que es las dos cosas elige su
  modo primario y puede cambiarlo).

## 3. Las 4 herramientas · espejo 1:1

El de productor vive en [`BusinessHub.tsx`](../components/business/BusinessHub.tsx)
con `PricingCalculatorCard / ProjectsCard / QuotesCard / ClientsCard` y datos en
[`lib/businessDb`](../lib/businessDb.ts). El de artista replica la estructura, cambia
las variables y el lente hacia reputación:

| Productor (hoy) | Artista (nuevo) | Qué hace / variables |
|---|---|---|
| Pricing Calculator | **Rate card** | Qué cobrar por un feature o un show. El rate *escala con reputación*: monthly listeners, seguidores, créditos previos, dB. Reputación como input del precio. |
| Active Projects | **Releases** | Catálogo (sencillos/EPs/álbumes): estado (escribiendo → grabando → mezcla → lanzado), fecha, distribuidora, y **cómo pegó** (streams, saves, playlist adds). El pulso de la carrera. |
| Clients & Leads | **Créditos & Splits** | Con quién ha trabajado = gráfica de credibilidad. Por track: colaboradores + % de cada quien. Aquí el artista **etiqueta al productor** dentro de la app (puente productor↔artista). |
| Quotes | **Ingresos & Placements** | Money por fuente: streams, shows, merch, sync, brand deals. Sync y brand deals cuentan doble (lana + estatus). |

**Número norte del módulo.** El de productor muestra "revenue this month"
([`BusinessHub.tsx` `revenueThisMonth`](../components/business/BusinessHub.tsx)).
El de artista muestra **momentum/reputación** (amarrado al dB existente, ver
[`lib/fennecDb.ts`](../lib/fennecDb.ts)), con la lana como panel secundario.

## 4. Modelo de datos (nuevo, en Supabase)

Espejo de las tablas de negocio existentes. Idempotente, mismo patrón que el resto.
- `account_type` en `profiles` (o tabla de perfil): `'artist' | 'producer'`, default
  `'producer'` para no romper cuentas actuales.
- `artist_releases` (id, user_id, title, type, status, release_date, distributor,
  streams, saves, created_at).
- `artist_credits` (id, user_id, release_id?, collaborator_name, collaborator_role,
  split_pct, linked_fennec_user_id?, created_at) ← `linked_fennec_user_id` es la
  conexión a otro usuario Fennec (el productor).
- `artist_income` (id, user_id, source, amount, currency, date, is_placement, created_at).
- Rate card puede ser calculado (sin tabla) o guardar `artist_rate_settings`.
- RLS: mismo patrón que las tablas de negocio actuales (owner-only read/write).

## 5. Qué se comparte vs qué se forkea

**Se forkea (por `account_type`):** solo el render del Business Hub y sus 4 cards,
más su modelo de datos. El gate de onboarding.

**Se comparte tal cual:** Cinta (feedback de tracks), Community, Fennec ID, dB,
Content Lab / marketing (afinar trends por perfil es opcional, fase 2).

## 6. Build por fases

1. **Fase 0 · Gate.** `account_type` en perfil + pregunta de onboarding + branch en
   el Business Hub (si `artist` → `ArtistBusinessHub`, si no → el actual). Con el
   ArtistBusinessHub vacío/placeholder ya se puede meter artistas a probar el resto
   de la app.
2. **Fase 1 · Releases + Créditos/Splits.** Las dos que más pegan a reputación y las
   que crean la conexión productor↔artista.
3. **Fase 2 · Ingresos & Placements + Rate card.** La capa de lana.
4. **Fase 3 · Número norte de momentum** amarrado al dB, y afinar Content trends por
   perfil.

## 7. La tarea de mundo real (no saltársela)

Aunque ya decidimos construir, antes/durante la Fase 1: **conseguir 2-3 artistas de
verdad** (de los que comentaron o de la red de Paco) que sean los primeros testers,
y preguntarles cómo llevan HOY la lana y los créditos de su música. Si dicen "en el
bloc de notas / nada", confirma que Releases y Splits valen oro. Si ya usan algo,
ver qué les falta. Eso convierte el build en algo validado, no en una apuesta a
ciegas sobre un comentario.

## 8. Riesgos

- **Dilución de posicionamiento.** El landing hoy dice "para productores". Al abrir
  a artistas, el mensaje se puede volver genérico y bajar conversión. Mitigar: no
  decir "para todos los músicos"; segmentar el copy por rol (dos ángulos, mismo
  producto).
- **Módulo a medias.** Si Releases/Splits se sienten como el módulo de productor con
  otra etiqueta, el artista churnea. Por eso es build real (enfoque B), no re-label.
- **Trampa de plataforma de dos lados.** La conexión productor↔artista es premio, no
  wedge. No construir la capa social de matchmaking antes de que ambos lados jalen.
