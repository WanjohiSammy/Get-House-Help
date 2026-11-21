# Jirani — house help web app

Households find a checked house help who lives nearby, with no sign-up. Helps join for free. You vet them and confirm payments from a simple admin page.

It runs free on **Cloudflare Pages** (site + API) with **Cloudflare D1** (database). There's no build step and no framework: plain HTML, CSS and JavaScript.

## What's inside

| Page | Who | What it does |
| --- | --- | --- |
| `/` | Households | Choose live-in, live-out or day help |
| `/request.html` | Households | One screen: type, tasks, start, area → instant shortlist of 3 |
| `/shortlist.html?r=…` | Households | The 3 closest matches. Names shortened, phones hidden until paid |
| `/help.html?id=…` | Households | Profile with every check you did |
| `/pay.html?r=…` | Households | Pay KES 500 by M-Pesa to get all 3 numbers |
| `/join.html` | House helps | Kiswahili-first sign-up form. Free, always |
| `/admin.html` | You and field agents | List of helps to vet, map of all helps, add a help, requests and payments (admin only) |
| `/admin-help.html?id=…` | You and field agents | One help's vetting checklist, home pin on a map, profile, approve, full history |

**No accounts.** A household's shortlist link is private, and the phone remembers it so they can come back. Their M-Pesa number is their identity. Helps join by form or WhatsApp.

## Try it on your computer (nothing to install)

1. Install **Node.js 22.5 or newer**, the LTS version from [nodejs.org](https://nodejs.org). Check with `node --version`.
2. Unzip the project, open a terminal **inside the `jirani-app` folder**, and run:
   ```bash
   npm start        # same as: node tests/local-server.mjs
   ```
3. Open the address it prints, usually **http://localhost:8788**. If that port is busy, it uses the next free one and tells you which.
   - Staff portal: `/admin.html`. Admin token `test-admin-token-123`, field agent token `test-agent-token-456` (Jane).
   - Demo helps are loaded, including Ruth Atieno waiting to be vetted. Everything resets when you stop the server with Ctrl+C.
4. Run the automated checks with `npm test`. It should end with "All 36 checks passed."

**If it doesn't work:**

| You see | Fix |
| --- | --- |
| "Jirani needs Node.js 22.5 or newer" | Install the LTS from nodejs.org, then open a **new** terminal |
| A page saying "Start the Jirani server first" | You opened the HTML file directly. Run `npm start` and use the localhost address |
| `Cannot find module …/tests/local-server.mjs` | Your terminal isn't in the `jirani-app` folder. `cd` into it first |
| Pages load but fonts look plain | Normal when offline; Google Fonts loads when you're online |
| Anything else | Copy the full error from the terminal and send it to me |

**Optional: Cloudflare's own local runner.** This is closer to the live site, but it downloads Wrangler the first time:
```bash
cp .dev.vars.example .dev.vars     # on Windows: copy .dev.vars.example .dev.vars
npm run dev:setup                  # creates the local database with demo data
npm run dev
```

## Put it online for free (about 15 minutes)

1. Make a free account at [dash.cloudflare.com](https://dash.cloudflare.com/sign-up). No card needed for this.
2. In this folder, log in: `npx wrangler login`
3. Create the database:
   ```bash
   npx wrangler d1 create jirani
   ```
   Copy the `database_id` it prints into `wrangler.toml`.
4. Create the tables: `npm run db:init`
5. In `wrangler.toml`, fill in `TILL_NUMBER` and `WHATSAPP_NUMBER` (format `2547XXXXXXXX`).
6. Create the project and deploy:
   ```bash
   npx wrangler pages project create jirani --production-branch main
   npm run deploy
   ```
   The deploy script uses `--branch main`, so it always goes to your live address and not to a preview copy.
   Your site is live at `https://jirani.pages.dev`, or a similar name if that one is taken.
7. Set your admin password (and agent tokens, if you have agents), then deploy once more so they take effect:
   ```bash
   npx wrangler pages secret put ADMIN_TOKEN     # paste a long random string
   npx wrangler pages secret put STAFF_TOKENS    # optional, e.g. Jane:long-random-1
   npm run deploy
   ```
8. Open `/admin.html` on your site and log in with that token.

**Prefer GitHub?** Push this folder to a repo, then in Cloudflare go to Workers & Pages → Create → Pages → Connect to Git. Leave the build command empty and set the output directory to `public`. Add the D1 binding (`DB`) and variables under Settings. Every push then deploys automatically.

## Payments

**Manual mode (default, free, no paperwork).** The household pays your Lipa na M-Pesa Till and types the M-Pesa code. It shows in Admin → Requests. You check your M-Pesa messages and tap **Confirm payment**. Their page refreshes by itself and shows the numbers. Each code can be used only once.

**Automatic STK push (later).** The household gets the PIN prompt and the numbers unlock by themselves.

1. Register at [developer.safaricom.co.ke](https://developer.safaricom.co.ke), create an app, and copy the sandbox keys.
2. Set `PAYMENT_MODE = "sandbox"` in `wrangler.toml` and add these secrets: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_SECRET` (any random string).
3. When Safaricom approves your Go-Live, switch to `PAYMENT_MODE = "live"` with your live keys. For a Till rather than a Paybill, also set `MPESA_TRANSACTION_TYPE = "CustomerBuyGoodsOnline"` and `MPESA_PARTY_B` to the till number. `MPESA_SHORTCODE` is then your store number.

## The vetting portal

Open `/admin.html` and log in with your token.

**Who can do what.** You (`ADMIN_TOKEN`) can do everything. Field agents each get their own token in `STAFF_TOKENS` (for example `"Jane:long-random-1,Peter:long-random-2"`). Agents can add helps, record checks and pin locations. Only you can approve or reject a help, or see requests and payments. Every step records who did it and when.

**The checklist.** Each help has six cards. Badges update automatically from what is recorded, and nobody can tick a badge by hand.

| Step | What to record | Badge earned when |
| --- | --- | --- |
| National ID | Saw the original, name matches, 18 or older. **Never record the ID number.** | Passed |
| Certificate of Good Conduct | Certificate reference and date issued | Passed |
| Reference 1 and 2 | Prefilled from the join form; how long, would they rehire. "No answer" lets you try again | Both passed |
| Meet in person | Date, place, four 1–5 scores | Passed |
| Training (optional) | Course, trainer, date | Any course passed → "Certified" |

**Rules the app enforces:**
- An ID check can't pass unless all three boxes are ticked.
- A fail needs a written reason.
- Nobody can be approved before passing the ID check.
- If a later ID check fails, an approved help goes straight back to "To vet" and disappears from shortlists.

**Location.** On the help's page, drag the pin to her estate or tap "I'm at her home: use my location". Pins are rounded to about 100 m. Households only ever see the travel time, never the pin. Households and helps can also tap **Use my location** on the request and join forms for more accurate matching. Everyone else is matched on the centre of their area.

## Maps (free)

Maps use [Leaflet](https://leafletjs.com) and free [OpenStreetMap](https://www.openstreetmap.org) tiles. No API key, no card. The public OSM tile servers are donation-funded and meant for light use. That's fine for your staff pages, but if traffic grows, switch to a hosted tile provider by setting `MAP_TILE_URL` and `MAP_ATTRIBUTION`. "Open in Google Maps" links are always free.

Already created your database with the first version? Run the migration once:

```bash
npx wrangler d1 execute jirani --remote --file=migrations/0002_vetting_and_location.sql
```

## Your weekly routine

1. **To vet**: new helps from the join form. Open each one and work down the checklist. Agents can do this from their phones in the field.
2. **Add a help**: for people who joined by WhatsApp or in person. It opens straight into her checklist.
3. **Requests**: confirm payments and mark who was hired. A request with an empty shortlist means nobody nearby matched yet, so find someone and message the household.
4. Set a help to `unavailable` once they are hired, so they stop appearing.

## Changing things

- **Areas:** `lib/areas.js` (name + rough map point)
- **Fees, till, WhatsApp:** `[vars]` in `wrangler.toml`
- **Colours and fonts:** the top of `public/styles.css`
- **Matching:** `findMatches` in `lib/helps.js` (closest first, then best task fit, then most checks)

## Privacy and safety

- Households see only first name + initial, area and checks until they pay. Then they get full name and phone for their 3 matches only.
- The app never stores ID numbers or ID photos. Look at the ID in person or on WhatsApp, then delete any photo once checked.
- Home pins are rounded to about 100 m and visible to staff only.
- Keep `ADMIN_TOKEN` long and private. `/admin.html` is not linked from anywhere and is hidden from search engines.
- You hold personal data, so read up on registering with Kenya's Office of the Data Protection Commissioner before you grow.
