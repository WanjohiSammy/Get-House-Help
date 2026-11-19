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
| `/admin.html` | You | Vet and approve helps, add helps you met on WhatsApp, confirm payments, mark hires |

**No accounts.** A household's shortlist link is private, and the phone remembers it so they can come back. Their M-Pesa number is their identity. Helps join by form or WhatsApp.

## Try it on your laptop (nothing to install)

You need Node.js 22.5 or newer.

```bash
node tests/local-server.mjs      # open http://localhost:8788
node tests/api.test.mjs          # runs 28 checks on the whole API
```

The local server loads 3 demo helps into a temporary in-memory database. Admin token: `test-admin-token-123`.

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
   Your site is live at `https://jirani.pages.dev`, or a similar name if that one is taken.
7. Set your admin password, then deploy once more so it takes effect:
   ```bash
   npx wrangler pages secret put ADMIN_TOKEN     # paste a long random string
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

## Your weekly routine

1. **To vet**: new helps from the join form. Call their 2 references, check their ID on WhatsApp, meet them, tick the checks, write a short public "About", and set the status to `approved`.
2. **Add a help**: for people who joined by WhatsApp or in person.
3. **Requests**: confirm payments and mark who was hired. A request with an empty shortlist means nobody nearby matched yet, so find someone and message the household.
4. Set a help to `unavailable` once they are hired, so they stop appearing.

## Changing things

- **Areas:** `lib/areas.js` (name + rough map point)
- **Fees, till, WhatsApp:** `[vars]` in `wrangler.toml`
- **Colours and fonts:** the top of `public/styles.css`
- **Matching:** `findMatches` in `lib/helps.js` (closest first, then best task fit, then most checks)

## Privacy and safety

- Households see only first name + initial, area and checks until they pay. Then they get full name and phone for their 3 matches only.
- The app does not store ID photos. Look at them on WhatsApp and delete them once checked.
- Keep `ADMIN_TOKEN` long and private. `/admin.html` is not linked from anywhere and is hidden from search engines.
- You hold personal data, so read up on registering with Kenya's Office of the Data Protection Commissioner before you grow.
