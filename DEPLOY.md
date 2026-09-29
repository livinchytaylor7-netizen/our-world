# Our World standalone deployment

This branch builds a Cloudflare Worker with D1 and R2. Keep the current ChatGPT Site online until the new site and data have been checked.

## Prepare Cloudflare

1. Create one D1 database, `our-world`, and one private R2 bucket, `our-world-photos`. Copy the D1 database ID and Cloudflare account ID.
2. Create a Workers API token with permissions to deploy Workers, write D1 and use R2. Store the token as a GitHub Actions repository secret (`CLOUDFLARE_API_TOKEN`); also set `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_D1_ID` as secrets and `CLOUDFLARE_R2_BUCKET` as repository variable.
3. Apply `drizzle/0000_loving_darkhawk.sql` to the new D1 database, then `migrations/0001_accounts.sql`. The latter creates the account tables and seeds the family settings. The Cloudflare D1 SQL console can run these scripts separately. Do not apply either script to the existing Site database.
4. Upload this repository to GitHub with this branch as `main`, then run **Actions → Deploy Our World → Run workflow**. The workflow builds and deploys a Worker named `our-world`. A computer with Node 22 and pnpm can instead run `pnpm install`, `pnpm build`, `node scripts/configure-deploy.mjs`, and `pnpm exec wrangler deploy --config dist/server/wrangler.json` after setting the three Cloudflare variables.
5. In the Worker settings add encrypted secrets `OWNER_EMAIL` (Li's email), `SETUP_KEY` (a new long random setup code), `APP_ORIGIN` (the exact deployed `https://…workers.dev` URL), `RESEND_API_KEY` and `MAIL_FROM` (a verified sender). Resend supplies password reset email. These are Worker runtime secrets, not GitHub repository variables. Set them before opening the login page. Restrict the setup code to Li; rotate or delete it after Li registers.
6. On the deployed site choose **Set up Li’s account**, enter the matching email, setup code and a password of at least 12 characters. In **People & access**, save Fiona's email, create the invitation link and share it with her. She creates her own account using that link. Both then sign in through the independent URL.

## Data migration and release gate

The new D1 database starts empty. An export list contains travel records but does **not** contain the original photo bytes. Export the latest records from the current Site and save every photo separately before entering or importing them into the independent site. Check the record count, country and city totals, ownership, dates, notes, wish list and each photo on both accounts. The old Site must stay available until this check succeeds. A migration from the Site's underlying D1 and R2 requires authorized exports of both; no automatic migration is claimed here.

For iPhone, open the new independent URL in Safari and use **Share → Add to Home Screen**. Remove the previous `Our World` home screen shortcut whose icon is `O`; iOS may retain its old icon even after the web app updates. The standalone manifest has the approved 180px, 192px, 512px and maskable icons.
