# Conectar Google Calendar a Fennec — pasos que TÚ tienes que hacer

El código ya está desplegado, pero **el botón "Connect Google Calendar" no
aparece hasta que existan las credenciales** (`NEXT_PUBLIC_GOOGLE_CLIENT_ID`).
Así que hoy en producción nadie lo ve ni truena nada. Cuando tengas 20 minutos,
haz esto y queda vivo.

Es tu cuenta de Google, por eso no lo puedo hacer yo.

## 1. Crear el proyecto y las credenciales OAuth

1. Entra a <https://console.cloud.google.com/> con tu cuenta.
2. Arriba, crea un proyecto nuevo (ej. "Fennec") o usa uno existente.
3. Menú → **APIs & Services → Library**. Busca **Google Calendar API** y dale
   **Enable**.
4. Menú → **APIs & Services → OAuth consent screen**:
   - User type: **External**. Create.
   - App name: `Fennec`. User support email: el tuyo. Developer contact: el tuyo.
   - **Scopes**: agrega `.../auth/calendar.readonly` (solo lectura, no escribe
     en tu Google).
   - **Test users**: agrega tu propio correo (mientras esté en "Testing", solo
     los test users pueden conectar; para abrirlo a todos hay que publicar la
     app, que puede pedir verificación de Google si crece).
5. Menú → **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Name: `Fennec Web`.
   - **Authorized redirect URIs**, agrega exactamente:
     ```
     https://app.fennec.audio/api/gcal/callback
     ```
   - Create. Te da un **Client ID** y un **Client Secret**. Cópialos.

## 2. Poner las llaves en Vercel

En el proyecto **fennec** de Vercel → Settings → Environment Variables, agrega
(Production, y Preview si quieres):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | el Client ID (termina en `.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | el Client Secret |
| `GOOGLE_REDIRECT_URI` | `https://app.fennec.audio/api/gcal/callback` |

El `NEXT_PUBLIC_GOOGLE_CLIENT_ID` es el que **prende el botón** en la app. El
secret **nunca** lleva `NEXT_PUBLIC_` (se quedaría expuesto en el navegador).

Redeploy (o el siguiente push) toma las variables.

## 3. Probar

1. Entra a Fennec → módulo **Marketing** → calendario.
2. Aparece **"Connect Google Calendar"**. Dale, te manda a Google, aceptas.
3. Regresas a la app y tus eventos de Google salen como **puntos azules** en la
   semana; al picar un día se ven listados arriba de tus tareas de contenido.

## Qué hace por dentro (para referencia)

- OAuth con scope **read-only**: Fennec lee tu calendario primario, nunca escribe.
- Tokens guardados en `user_integrations` (platform `google_calendar`), igual que
  Spotify. RLS: solo el dueño los lee; el `refresh_token` vive server-side.
- Rutas: `/api/gcal/connect`, `/callback`, `/events`, `/disconnect`.
- Todo gateado por `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: sin él, cero UI.

## Nota honesta

Escribí este flujo copiando el patrón que ya funciona con Spotify, pero **no lo
pude probar de punta a punta** porque el OAuth necesita tus credenciales. En
cuanto pongas las llaves y lo pruebes una vez, si algo falla lo afino contigo.
El riesgo es bajo: es una integración nueva y aislada, no toca nada existente.
