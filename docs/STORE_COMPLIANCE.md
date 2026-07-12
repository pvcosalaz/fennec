# Store Compliance — App Store & Google Play

Status of the store-readiness requirements and what still needs a human
(dashboard config, form filling). Code work landed on branch `feat/desktop-shell`.

Last updated: 2026-07-12.

---

## Requirement status

| Requirement | Apple | Google | Status |
|---|---|---|---|
| Privacy Policy reachable in-app | required | required | DONE — `/privacy`, linked under login |
| Terms of Service | recommended | recommended | DONE (draft) — `/terms`, **Paco to review** |
| Consent before account creation | required | required | DONE — notice under login controls |
| In-app account deletion (real) | required | required | DONE — Settings > Data & Reset > Delete account |
| Web account-deletion URL | — | required | DONE — `/data-deletion` |
| Sign in with Apple | **required** (offers Google/FB) | — | CODE DONE — **needs dashboard config (below)** |
| Data Safety form / App Privacy labels | required | required | **Paco to fill in the consoles** (data map below) |

---

## Action items for Paco (dashboard / console — cannot be done in code)

### 1. Enable Sign in with Apple (so the new button works)
The button is live in the login screen but will error until the provider is
configured. Two places:

**Apple Developer** (developer.apple.com, needs the paid Apple Developer account):
1. Create an **App ID** (or use the app's) with "Sign in with Apple" capability.
2. Create a **Services ID** (this is the OAuth client id). Enable "Sign in with Apple".
3. Under the Services ID, set:
   - Domain: `drmhwzxytwmkpfnjwmra.supabase.co` (or the custom auth domain if set — see task #31)
   - Return URL: `https://drmhwzxytwmkpfnjwmra.supabase.co/auth/v1/callback`
4. Create a **Key** with "Sign in with Apple" enabled; download the `.p8`.

**Supabase** (dashboard > Authentication > Providers > Apple):
1. Toggle Apple on.
2. Paste the Services ID (client id), Team ID, Key ID, and the `.p8` contents.
3. Save. Test the "Continue with Apple" button on the login screen.

> Reference: Supabase docs, "Login with Apple".

### 2. Fill the store privacy forms (data map below)
- **Google Play**: Play Console > App content > Data safety.
- **Apple**: App Store Connect > App Privacy.

Both must match what the app actually collects. Fennec's data map:

| Data | Collected | Purpose | Shared |
|---|---|---|---|
| Email address | Yes (account) | Account, auth | No |
| Name | Yes (profile) | App functionality | No |
| Photos (avatar) | Yes (optional) | App functionality | No |
| Audio files (uploaded tracks) | Yes | App functionality (the tape) | No |
| User content (projects, quotes, clients, notes) | Yes | App functionality | No |
| Social handles / connected accounts (Spotify, YouTube, Facebook) | Yes | Display stats | No |
| Purchase history (Stripe) | Yes | Subscription billing | Processor only (Stripe) |
| Analytics / product usage (`user_events`) | Yes | Analytics, app improvement | No |

- Data is **not sold**.
- Users can **request deletion** in-app (Settings) and via web (`/data-deletion`).
- Encryption in transit and at rest (Supabase).

### 3. Account-deletion URL for Play Console
When Google asks for the account-deletion URL, use:
`https://app.fennec.audio/data-deletion` (must match the Privacy Policy — it does).

### 4. (Related) Clean up the OAuth consent screen — task #31
The Google login screen shows the raw `*.supabase.co` subdomain. Fix via a
verified **OAuth consent screen** in Google Cloud Console (app name + logo +
verified domain) and/or a **Supabase custom auth domain** (Pro plan) so the
redirect shows `fennec.audio`. Same custom domain would also clean the Apple
return URL above.

---

## What the code already does

- **Deletion route** `POST /api/account/delete`: auth via bearer token, cancels
  any active Stripe subscription (best-effort), deletes the `profiles` row
  (cascades profiles-referencing tables) then the auth user (cascades the rest,
  removes login). Wired to a two-step "Delete account" danger zone in Settings.
- **Sign in with Apple** button + `apple` OAuth call in `AuthGate.tsx`.
- **Consent notice** + Terms/Privacy links under the login controls.
- Legal pages: `/privacy`, `/terms`, `/data-deletion` (all cross-linked).
