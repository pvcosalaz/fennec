# Spec · Business de artista v1 — eventos y tarifa por show

> Definido con Paco el 2026-08-18. **Supersede la parte de herramientas** del spec de julio
> (`SPEC-artist-business-module.md`): aquel ponía el eje en reputación/catálogo (Rate card,
> Releases, Créditos/Splits, Ingresos); Paco lo redefinió con el eje en **eventos**.
> Lo que sobrevive de julio: la arquitectura (un solo producto, `account_type` intercambia
> solo el Business) y Releases, que aquí baja a ser un tipo de evento. **Splits queda
> diferido, no muerto**: era el puente productor↔artista y se retoma cuando haya artistas
> reales dentro.

## El modelo: un timeline, dos direcciones de dinero

Paco pidió tres cosas a medir: **gigs, grabaciones, lanzamientos**. Se guardan en UNA
tabla (`artist_events`, un timeline de carrera) pero la matemática los trata distinto,
porque en la vida real un gig te paga y una grabación la pagas tú:

| Kind | Dirección | Status ladder | Campos propios |
|---|---|---|---|
| `gig` | ingreso (`fee`) − costo del show (`cost`) | hold → confirmed → played → paid | venue, city, deposit |
| `recording` | inversión (`cost`) | planned → in_progress → done | — |
| `release` | inversión (`cost`) + retorno manual (`recouped`) | planned → scheduled → released | release_type (single/ep/album/video) |

- `hold` existe porque así funciona el booking real: una fecha apartada sin confirmar.
- `deposit` existe porque los artistas también cobran por anticipo (regla de Paco).
- `recouped` es manual: el streaming llega goteando y por fuera; v1 no integra regalías.
- Los números de cabecera del hub: **This month → earned / invested / net.**

**Por qué tabla propia y no `business_projects` con un campo "tipo":** la migración de
`account_type` lo deja avisado — mientras cada oficio tenga su tabla, cambiar de modo en
Settings no toca una fila y es reversible. Mezclarlos volvería destructivo el switch.

## La calculadora: tarifa mínima por show

Misma filosofía que la de producción (gastos mensuales **estimados** → precio mínimo),
con tres correcciones porque la vida del artista no es la del productor:

1. **El divisor es demanda, no capacidad.** El productor divide entre los proyectos que
   caben en sus horas; al artista las fechas se las ofrecen. Se pregunta *cuántos shows
   esperas al mes de forma realista* (`showsPerMonth`), no cuántos cabrían.
2. **Los shows no pagan el mes entero.** Streaming, sync, merch también entran. Se
   pregunta qué % del ingreso viene del vivo (`liveSharePercent`, default 60) y las
   fechas solo cargan con esa parte.
3. **La comisión sale del cheque.** Manager/booking (`commissionPercent`, default 0
   porque la mayoría indie se autogestiona) se aplica al final, sobre el bruto.

```
monthlyNeed = (vida + proyecto) × (1 + tax%) + emergencyFund
liveTarget  = monthlyNeed × liveShare%
netPerShow  = liveTarget / showsPerMonth
minFee      = (netPerShow + avgShowCost) / (1 − commission%)
```

Gastos del proyecto (mensuales, estimados — el copy lo dice explícito, pedido de Paco):
equipo prorrateado, sueldos/equipo, marketing, sesiones (grabación/fotos),
ensayos y transporte, distribución digital, otros. Vida personal: mismos rubros que la
de producción. `avgShowCost` = promedio de banda/viáticos por show (los reales se
registran por evento).

## Dónde vive cada cosa

- **Tabla**: `artist_events` con RLS owner-only (patrón de `business_*`).
- **Matemática y acceso**: `lib/artistBusiness.ts`, funciones puras + CRUD estilo
  `businessDb.ts`.
- **Ajustes de la calculadora**: localStorage `fennec-artist-pricing-v1` + espejo en nube
  vía `pushUserState/pullUserState` (patrón exacto del pricing de productor).
- **UI**: `components/artist/ArtistBusinessHub.tsx` (timeline + números + tarifa) y
  `ArtistRateSetup.tsx` (la tabuladora, un formulario por secciones, no wizard de 6 pasos).
- **Gate**: donde `PricingCalculator` monta `BusinessHub`, si
  `profile.account_type === 'artist'` monta el hub de artista. Nada más cambia.
- **Idioma**: UI en inglés (regla Fennec), claves i18n EN + ES.

## Fuera de v1, a propósito

- **dB del artista**: la actividad del dB hoy suma proyectos/clientes/cotizaciones; la
  regla ya anotada es que sume los DOS mundos antes de que el selector se despierte.
- **Splits/Créditos** (el puente productor↔artista de julio).
- **Regalías automáticas** (Spotify API etc.): `recouped` manual mientras.
- **Cotizaciones/contratos de show**: el equivalente a Quotes para fechas.
- La pantalla "What are you?" sigue EN PAUSA hasta que Paco la despierte.

---

## v1.1 · Reestructura organización-primero (2026-08-19, mismo día)

La v1 era un espejo del hub de productor (héroe de dinero, gráfica, tabla) y Paco la
rechazó: "no tanto el dinero, sino la organización de fechas, grabaciones y
lanzamientos... y sí tener la calculadora y generar cotizaciones". El módulo ahora lee:

1. **Qué sigue** — el próximo evento en grande con cuenta regresiva, junto a la agenda
   cronológica. La vida del artista se organiza por calendario, no por estado de cuenta.
2. **Tres carriles** — Fechas / Grabaciones / Lanzamientos, cada uno con su lista (lo
   próximo primero) y su alta propia.
3. **Abajo, el dinero** — el mes compacto y las dos herramientas con nombre:
   la calculadora de tarifa y **Cotizar un show**.

**Cotizar un show** (nuevo): toma un gig de la agenda, arranca del mínimo de la tarifa
(nunca de lo que ofrezca el venue; avisa si escribes menos: "estarías pagando por
tocar"), arma fee + anticipo para confirmar (default 50%) + resto el día del show, y
enseña aparte tu neto tras costos y comisión. Se entrega **copiada como texto** (los
tratos de fechas se cierran por WhatsApp, no por PDF) y "guardar" escribe el fee en el
gig: la cotización del artista no es un documento aparte, es el número que su evento
promete. Sin tabla nueva.
