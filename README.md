# MtaaCare — trusted help. Right around the corner.

MtaaCare helps families **find verified household help near their home**, and helps house helps **get discovered by households in their neighbourhood**. Vetted helpers, local connections, simple and free to join, for households and helpers across Kenya. It starts in Nairobi, and you run it from a simple staff portal.

**Positioning**
- **Households:** find trusted, verified help near you.
- **House helps:** get discovered by households in your neighbourhood. Join for free.
- **Trust promise:** every listed helper goes through MtaaCare's verification: ID, Certificate of Good Conduct, two past employers, and a meeting in person.

- **Households** tell you what they need in one screen and see up to 3 checked helps who live close by. They never create an account; their WhatsApp number is enough.
- **House helps** join free from their phone, in Kiswahili or English, or through you on WhatsApp.
- **You (and later, field agents)** vet each help in person, approve her, and share contacts with households.

It's built to cost nothing to run while you test the idea: **Cloudflare Pages** hosts the site and API, **Cloudflare D1** is the database, and **OpenStreetMap** provides the maps. There's no build step and no framework, just plain HTML, CSS and JavaScript.

---

## Contents

1. [How it works](#1-how-it-works)
2. [What's in the folder](#2-whats-in-the-folder)
3. [Run it on your computer](#3-run-it-on-your-computer)
4. [Deploy: the journey from zero](#4-deploy-the-journey-from-zero)
5. [Your first month: launching with no data](#5-your-first-month-launching-with-no-data)
6. [Settings](#6-settings)
7. [Payments: free, then manual, then automatic](#7-payments-free-then-manual-then-automatic)
8. [The vetting portal](#8-the-vetting-portal)
9. [Matching, distance and maps](#9-matching-distance-and-maps)
10. [Privacy and safety](#10-privacy-and-safety)
11. [Running it day to day](#11-running-it-day-to-day)
12. [Troubleshooting](#12-troubleshooting)
13. [Commands](#13-commands)

---

## 1. How it works

```
Household                       You (staff portal)                House help
─────────                       ──────────────────                ──────────
Fills one form:                                                   Joins at /join
type, tasks, start, area,                                         (or you add her
WhatsApp number                                                   from WhatsApp)
        │                                                                │
        ▼                                                                ▼
Sees up to 3 approved helps     ◄── approve ──   Vet her: ID, Good Conduct,
within 15 km, closest first                      2 references, meet in person,
(first name + initial only)                      pin where she lives
        │
        ▼
Free pilot: you WhatsApp them ──► "Share contacts" ──► household sees full names + numbers
Paid mode: they pay by M-Pesa ──► you confirm (or automatic) ──► same
        │
        ▼
They call and interview ──► you mark who was hired ──► check in after a week
```

**No helps near them yet?** They still leave their WhatsApp number. You find and vet someone, press **Find matches again**, then **Share contacts**. That hands-on matching is how you start with no data.

## 2. What's in the folder

| Path | What it is |
| --- | --- |
| `public/index.html` → **/** | Home: live-in, live-out or day help |
| `public/find.html` → **/find** | The one-screen request (with "Use my location") |
| `public/matches.html` → **/m/&lt;id&gt;** | The household's private matches link, short enough for WhatsApp |
| `public/helper.html` → **/helper/&lt;id&gt;** | One helper's public profile: what was checked, travel time |
| `public/pay.html` → **/pay/&lt;id&gt;** | Payment (only when `PAYMENT_MODE` isn't `free`) |
| `public/join.html` → **/join** | Sign-up for helpers in 3 short steps (about you, your work, past employers), Kiswahili first, with a languages dropdown (Kiswahili, English, French, German, Kenyan languages, and Other to type) |
| `public/staff.html` → **/staff** | Staff portal: to vet, approved, map, requests, add a help |
| `public/staff-helper.html` → **/staff/helper/&lt;id&gt;** | One helper's vetting checklist, map pin, decision, history |
| `public/_redirects` | Makes the clean addresses above work on Cloudflare |
| `public/favicon.svg` | The MtaaCare logo (pin, house and heart), also used as the browser tab icon |
| `public/app.js`, `staff.js`, `styles.css` | Shared code and look |
| `functions/api/…` | The API (Cloudflare Pages Functions), one file per address |
| `lib/…` | Shared server code: matching, vetting rules, M-Pesa, areas |
| `schema.sql` | Creates the database tables |
| `seed.sql` | Demo data for your computer only |
| `migrations/` | Upgrades for databases made with older versions |
| `tests/local-server.mjs` | Runs everything on your computer with no installs |
| `tests/api.test.mjs` | 46 automated checks of the whole API |
| `wrangler.toml` | Cloudflare settings |

## 3. Run it on your computer

1. Install **Node.js 22.5 or newer**, the LTS from [nodejs.org](https://nodejs.org). Check with `node --version`.
2. Open a terminal **inside the `mtaacare-app` folder** and run:
   ```bash
   npm start                      # same as: node tests/local-server.mjs
   ```
3. Open the address it prints, usually **http://localhost:8788**.
   - Staff portal: `/staff`. Admin token `test-admin-token-123`. Field agent token `test-agent-token-456` (Jane).
   - Demo helps are loaded, including Ruth Atieno waiting to be vetted.
   - It starts in the free pilot mode. To try payments: `PAYMENT_MODE=manual npm start` (on Windows PowerShell: `$env:PAYMENT_MODE="manual"; npm start`).
4. Run the checks with `npm test`. It should end with "All 46 checks passed".

Everything resets when you stop the server with Ctrl+C. Problems? See [Troubleshooting](#12-troubleshooting).

## 4. Deploy: the journey from zero

### What you need, and what you don't

| Need now | Don't need yet |
| --- | --- |
| A free Cloudflare account (just an email, no card) | A Till, Paybill or Safaricom developer keys |
| Node.js 22.5+ on your computer | Any helps, households or areas data |
| This folder (and your GitHub repo, optionally) | Staff or field agents (it's just you) |
| A long random password for the staff portal | A domain name (you get a free `.pages.dev` address) |
| Optional: a WhatsApp number for "Message us" | A business registration |

### Step by step (about 20 minutes)

**1. Log in to Cloudflare from your terminal.** Inside `mtaacare-app`:
```bash
npm install          # once: installs Wrangler
npm run login        # same as: npx wrangler login
```
A browser opens. Approve, then come back to the terminal.

**2. Create the database.**
```bash
npx wrangler d1 create mtaacare
```
It prints a `database_id`. Paste it into `wrangler.toml`, replacing `PASTE-YOUR-D1-DATABASE-ID-HERE`.

**3. Create the tables** (empty, with no demo data):
```bash
npm run db:init
```

**4. Fill in your settings** in `wrangler.toml` under `[vars]`. For launch, only two matter:
- `ADMIN_NAME = "Samuel"`
- `WHATSAPP_NUMBER = "2547XXXXXXXX"`, or leave it empty to hide the WhatsApp buttons.

Leave `PAYMENT_MODE = "free"`. You don't need any payment details yet.

**5. Create the site.**
```bash
npx wrangler pages project create mtaacare --production-branch main
```
If the name `mtaacare` is taken, pick another (e.g. `mtaacare-ke`) and use it in the next steps.

**6. Deploy.**
```bash
npm run deploy
```
It prints your address, e.g. `https://mtaacare.pages.dev`. The script deploys with `--branch main`, so it always updates the live address, not a preview copy.

**7. Set your staff password**, then deploy once more so it takes effect:
```bash
node -e "console.log(crypto.randomUUID())"     # makes a strong password; copy it
npm run secret                                  # paste it when asked
npm run deploy
```
Keep this password somewhere safe. You log in to `/staff` with it.

**8. Check it works.**
- [ ] Open your address on your phone. The home page loads.
- [ ] `/staff`: log in with your password. "To vet" is empty.
- [ ] **Add a help:** add yourself or a friend as a test help, record a passed ID check, and approve.
- [ ] Back on the home page, make a request in that help's area with your own WhatsApp number. You should see her.
- [ ] In the portal under **Requests**, press **Share contacts**. The household page now shows her number.
- [ ] Open one help's page and check the map shows (it needs internet).
- [ ] Delete the test: set the test help to "Rejected / away" and close the test request.

**9. Optional: put the code on GitHub.**
```bash
git push -u origin main     # the project is already connected to github.com/WanjohiSammy/Get-House-Help
```
To deploy automatically on every push instead of running `npm run deploy`, go to Cloudflare → Workers & Pages → Create → Pages → Connect to Git. Leave the build command empty, set the output directory to `public`, then under Settings add the D1 binding (`DB` → `mtaacare`), the variables, and the `ADMIN_TOKEN` secret.

### Updating the live site later

Change files, run `npm test`, then `npm run deploy`. Database changes come with a file in `migrations/`. Run it once with `npx wrangler d1 execute mtaacare --remote --file=migrations/<file>.sql`.

### Your addresses

| Who | Address on your free Cloudflare site | With your own domain later |
| --- | --- | --- |
| Households | `mtaacare.pages.dev` | `mtaacare.co.ke` |
| Helpers join | `mtaacare.pages.dev/join` | `mtaacare.co.ke/join` |
| Staff portal | `mtaacare.pages.dev/staff` | `mtaacare.co.ke/staff` |
| A household's matches | `mtaacare.pages.dev/m/k3x9…` | `mtaacare.co.ke/m/k3x9…` |

`localhost:8788` is only your computer while testing. Nobody else ever sees it.

## 5. Your first month: launching with no data

You don't need data to launch. You need **supply first, then demand, in one small area**.

**Week 1: pick one cluster and recruit helps.**
- Choose one area where helps live near families who hire, for example Kawangware/Kangemi next to Lavington/Kileleshwa/Westlands, or Kayole/Umoja next to Buruburu/Donholm.
- Share `/join` in church groups, chamas and estate WhatsApp groups, and with caretakers. It's free for helps, always.
- Aim for 15–20 sign-ups.

**Week 2: vet in person.**
- Call references, check IDs, and meet each help in person. Pin where she lives while you're there.
- Approve 8–10 good helps. It's fine to be strict; trust is the product.

**Week 3: open to households in that cluster only.**
- Post the home page link in the estate's parents' groups.
- Every request reaches you with a WhatsApp number. Message each household the same day, press **Share contacts**, and help them arrange interviews.

**Week 4: follow up and learn.**
- Mark who was hired. Message both sides after a week.
- Ask households: "Would you have paid KES 500 for this shortlist? KES 2,500 when you hired?"
- If yes from most of them, switch on payments (section 7).

Measure four things: requests per week, the share who got a shortlist within a day, the share who hired, and how many helps are still in the job after 30 days.

## 6. Settings

Set these in `wrangler.toml` under `[vars]`, then run `npm run deploy`.

| Setting | Default | What it does |
| --- | --- | --- |
| `PAYMENT_MODE` | `free` | `free`, `manual`, `sandbox` or `live` (section 7) |
| `MATCH_FEE` | `500` | KES to unlock a shortlist (paid modes) |
| `SUCCESS_FEE` | `2500` | KES you ask for when they hire (shown to households) |
| `PAY_TO_TYPE` | `pochi` | `till`, `pochi` or `phone` (manual mode) |
| `PAY_TO_NUMBER` | empty | Where households pay. **Manual mode stays free until this is set** |
| `PAY_TO_NAME` | `MtaaCare` | The name M-Pesa shows them |
| `WHATSAPP_NUMBER` | empty | Your WhatsApp, `2547…`. Empty hides the "Message us" buttons |
| `ADMIN_NAME` | `Admin` | Your name in the vetting history |
| `MIN_WAGE` | `18047` | Shown to households on every profile (KES/month, Nairobi and the other major towns) |
| `MAX_DISTANCE_KM` | `15` | Helps living further than this are never suggested |
| `MAP_TILE_URL`, `MAP_ATTRIBUTION` | OpenStreetMap | Swap the map provider |

These are secrets, set with `npx wrangler pages secret put NAME`:

| Secret | When |
| --- | --- |
| `ADMIN_TOKEN` | Always. Your staff portal password, 12+ characters |
| `STAFF_TOKENS` | When you have field agents: `Jane:long-random-1,Peter:long-random-2` |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_SECRET` | Only for `sandbox` or `live` payments |
| `MPESA_TRANSACTION_TYPE`, `MPESA_PARTY_B` | Only when using a Till with automatic payments (see below) |

For `npm run dev` on your computer, secrets go in a `.dev.vars` file; copy it from `.dev.vars.example`.

## 7. Payments: free, then manual, then automatic

**1. Free pilot (`PAYMENT_MODE = "free"`, the default).** No fees. Households see a "Free during our pilot" note. You message them and press **Share contacts** in the portal. Use this until you know people value the service.

**2. Manual M-Pesa (`PAYMENT_MODE = "manual"`).** No paperwork. Set `PAY_TO_TYPE` and `PAY_TO_NUMBER`:
- `pochi`: **Pochi la Biashara** on your own Safaricom line, opened from the M-Pesa menu. It keeps business money separate from personal money.
- `till`: a Lipa na M-Pesa Till (Buy Goods).
- `phone`: plain Send Money to a number.

The household pays, then types the M-Pesa code from their SMS. It appears under **Requests**. Check your M-Pesa messages and press **Confirm payment**. Their page refreshes and shows the numbers. Each code works only once.

**3. Automatic (`sandbox`, then `live`).** The household gets the PIN prompt and the numbers unlock by themselves.
1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke), create an app, and copy the sandbox keys.
2. Set `PAYMENT_MODE = "sandbox"` and add the M-Pesa secrets (`MPESA_CALLBACK_SECRET` is any random string you choose).
3. Once Safaricom approves your Go-Live, switch to `live` with your live keys. For a Till rather than a Paybill, also set `MPESA_TRANSACTION_TYPE = "CustomerBuyGoodsOnline"` and `MPESA_PARTY_B` to the till number. `MPESA_SHORTCODE` is then your store number.

In any mode, **Share contacts** also works for households who paid you another way, such as cash.

## 8. The vetting portal

Open `/staff` and log in with `ADMIN_TOKEN`.

**Who can do what.** You can do everything. Field agents each get their own token in `STAFF_TOKENS`. They can add helps, record checks and pin locations, but only you can approve or reject, or see requests and payments. Every step records who did it and when.

**The checklist.** Each help has these cards. Badges update automatically from what is recorded, and nobody can tick a badge by hand.

| Step | What to record | Earns |
| --- | --- | --- |
| National ID | Saw the original, name matches, 18 or older. **Never record the ID number.** | ID verified |
| Certificate of Good Conduct | Certificate reference and date issued | Part of "Checked" |
| Reference 1 and 2 | Prefilled from the join form; how long, would they rehire. "No answer" lets you try again | Part of "Checked" (both must pass) |
| Meet in person | Date, place, four 1–5 scores | Part of "Checked" |
| Training (optional) | Course, trainer, date | "Certified" |

**Rules the app enforces:**
- An ID check can't pass unless all three boxes are ticked.
- A fail needs a written reason.
- Nobody is approved without a passed ID check.
- If a later ID check fails, an approved help goes back to "To vet" and leaves all shortlists.

**Adding a help you met on WhatsApp:** go to **Add a help**, enter her name, phone, area and type of work, and it opens straight into her checklist.

## 9. Matching, distance and maps

- **How matches are chosen:** approved helps who do the requested type of work and live within `MAX_DISTANCE_KM` (15 km) of the household. They're ranked by distance first, then by how many requested tasks they do, then by how many checks they've passed. Each household sees at most 3.
- **Where people live:** the centre of their area by default. A household or help can tap **Use my location**, and staff can drag a help's pin on her page. Pins are rounded to about 100 m.
- **Travel time** shown to households is a rough matatu estimate: about 4 minutes per km plus 10 minutes waiting.
- **Places:** about 130 places people know, in `lib/areas.js`. That's most Nairobi estates, the commuter towns (Ruaka, Ruiru, Syokimau, Kitengela, Rongai…) and the main towns elsewhere (Mombasa, Kisumu, Nakuru, Eldoret and their estates, and more). Each has its town and other spellings people type, e.g. "Ongata Rongai", "Buru Buru", "Yaya". People find their place by **typing a few letters** on the find, join and staff pages. The map points are approximate, so check the ones you serve first. To add a place, add one line `['Name', 'Town', lat, lng, 'other spelling|another']`, then run `npm test` and `npm run deploy`.
- **Maps** use [Leaflet](https://leafletjs.com) and free [OpenStreetMap](https://www.openstreetmap.org) tiles: no key, no card. The public tile servers are meant for light use, which suits staff pages. If traffic grows, switch provider with `MAP_TILE_URL`. "Open in Google Maps" links are always free.

## 10. Privacy and safety

- Households see a help's first name, initial, area, checks and travel time. **Full names and phone numbers appear only after you share contacts or they pay**, and only for their 3 matches.
- Helps' map pins are visible to staff only, never to households.
- The app never stores ID numbers or ID photos. Look at the ID in person or on WhatsApp, then delete any photo.
- Shortlist links are private, unguessable links. Anyone with the link can see that shortlist, so households shouldn't post it publicly.
- Keep `ADMIN_TOKEN` and agent tokens secret. To remove an agent, delete them from `STAFF_TOKENS` and deploy.
- You hold personal data about real people. Read up on registering with Kenya's Office of the Data Protection Commissioner before you grow, and keep helps' consent (the join form asks for it).
- Before you charge placement fees, ask an employment lawyer whether you need registration as a private employment agency. Never charge helps.

## 11. Running it day to day

| Task | How |
| --- | --- |
| New help signed up | Portal → **To vet** → work through her checklist |
| New household request | Portal → **Requests** → **WhatsApp them** → **Share contacts** |
| Request with no matches | Find and vet a help nearby → approve → **Find matches again** → **Share contacts** |
| Someone was hired | **Requests** → choose her → **Mark hired**; set the help to "Hired / away" so she stops appearing |
| Back up the database | `npm run db:backup` (weekly; writes `backup.sql`) |
| Add an area | Add a line in `lib/areas.js` → `npm test` → `npm run deploy` |
| Custom domain (e.g. mtaacare.co.ke) | Buy it from a Kenyan registrar → Cloudflare → your Pages project → Custom domains |

Cloudflare's free plan easily covers a pilot. Check current limits on Cloudflare's pricing page if traffic grows.

## 12. Troubleshooting

| You see | Fix |
| --- | --- |
| "MtaaCare needs Node.js 22.5 or newer" | Install the LTS from nodejs.org, then open a **new** terminal |
| A page saying "Start the MtaaCare server first" | You opened an HTML file directly. Run `npm start` and use the localhost address |
| `Cannot find module …/tests/local-server.mjs` | Your terminal isn't in the `mtaacare-app` folder. `cd` into it first |
| Fonts look plain on your computer | Normal when offline; Google Fonts loads when you're online |
| Staff portal says "That token is not valid" (live site) | Set `ADMIN_TOKEN` with `npx wrangler pages secret put ADMIN_TOKEN`, then `npm run deploy` again |
| "no such table: helps" | Run `npm run db:init` (live) or `npm run dev:setup` (on your computer with `npm run dev`) |
| The live site shows an old version | Deploy with `npm run deploy` (it uses `--branch main`). A plain `wrangler pages deploy` may go to a preview address |
| Household sees "We're still checking helps near…" | No approved help within 15 km does that work. Recruit and approve one nearby, then **Find matches again** |
| Map is blank | It needs internet. If the rest works, the free tile server may be busy; try again or set `MAP_TILE_URL` |
| Anything else | Copy the full error from the terminal or the browser console and send it over |

## 13. Commands

Run `npm install` once in the project folder (it installs Wrangler). Node.js 22.5 or newer is needed.

| Command | What it does |
| --- | --- |
| `npm start` | Runs the whole site on your computer at http://localhost:8788 (demo data, resets on stop) |
| `npm test` | Runs all the API checks |
| `npm run deploy` | Tests, then puts the site live (always `--branch main`) |
| `npm run db:init` | First time only: creates the tables in the live database |
| `npm run db:stats` | Shows how many helps, approved helps and requests the live site has |
| `npm run db:backup` | Downloads a full copy of the live database to `backup.sql` |
| `npm run login` | Connects Wrangler to your Cloudflare account |
| `npm run secret` | Sets or changes `ADMIN_TOKEN`, your staff portal password (run `npm run deploy` after) |
| `node -e "console.log(crypto.randomUUID())"` | Makes a strong random password to use with `npm run secret` |
| `npm run logs` | Shows live server logs, for finding errors |
| `npm run deployments` | Lists recent deploys and which is live |
| `npm run dev` / `npm run dev:setup` | Runs with Wrangler's own local server and a local D1 copy (needs `.dev.vars`) |
