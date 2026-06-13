# Fennec Landing Page

Single-file landing (`index.html` + 2 images). No build step, no dependencies.

## Preview locally
Double-click `index.html`, or:
```bash
open "/Users/pacosalazar/Documents/Fennec App/fennec-landing/index.html"
```
Tip: append `?shot` to the URL to skip the splash animation (used for screenshots).

## Hosting options (pick one)

**Option A — Vercel (recommended, same stack as the app):**
```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec-landing"
vercel --prod
```
Then point a domain in Vercel → e.g. `www.fennec.audio` for the landing and move the app to `app.fennec.audio` — or use `get.fennec.audio` for the landing and leave the app where it is.

**Option B — Inside the app repo:** copy the three files into `fennec/public/landing/` and it ships with every deploy at `fennec.audio/landing/index.html` (no separate project, but uglier URL).

## Pending decisions
- Final domain / URL strategy
- App Store badge link (currently `href="#"` — set when the app is live on the App Store)
