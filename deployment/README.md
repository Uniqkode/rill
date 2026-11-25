# Deploy Rill’s hosted workspace

The hosted build uses Cloudflare Pages for the static frontend, Supabase Auth for email and password sign-in, and Supabase Postgres for workspaces, roles, irrigation zones and activity. The database checks the signed-in user’s membership on every read and write.

## Supabase

The migrations are already applied to Uniqkode’s Rill database. [Rill in Supabase](https://supabase.com/dashboard/project/keuywmomjslltntmzjbi)

1. For a new project, run the SQL migrations in order and keep `rill_private` out of the Data API’s exposed schemas. [Migrations](../supabase/migrations/)
2. Copy the project’s HTTPS URL and **publishable key** from API Keys. Store database credentials and secret keys in the services that use them.
3. Enable the Email provider, account creation and **Confirm email**. Keep Google disabled. Email confirmation preserves the ownership check for workspace invites. [Rill Auth providers](https://supabase.com/dashboard/project/keuywmomjslltntmzjbi/auth/providers)
4. Set the Auth Site URL to the Cloudflare Pages URL and add its exact `/login/` URL to the redirect allow list. Add `http://127.0.0.1:4173/login/` to the list for local testing. Users open confirmation and reset links in the browser that requested them. [Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)

## Resend SMTP

Verify a sending domain you own by adding the DNS records Resend provides. The GitHub Pages and Cloudflare Pages addresses are website hostnames. Supabase's built-in email service delivers to members of the Supabase project team. [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction) · [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Use Resend’s Supabase integration, or enable custom SMTP in Rill’s Supabase Auth settings and enter these values. [Resend integration](https://resend.com/supabase) · [Rill SMTP settings](https://supabase.com/dashboard/project/keuywmomjslltntmzjbi/auth/smtp)

| Setting | Value |
| --- | --- |
| Sender name | `Rill` |
| Sender email | An address on the verified Resend domain |
| SMTP host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | A Resend key with Sending access scoped to that domain |

Keep the Resend key in Supabase. Turn off click tracking for the sender domain so the Auth links keep their original destinations. Confirm signup and password reset delivery with a test account after saving the settings.

## Cloudflare Pages

Create a Pages project linked to this GitHub repository. Set its production branch to the branch containing the workspace code, build command to `npm run build`, output directory to `dist`, and Node version to 22 or later. Set these build environment variables:

| Variable | Value |
| --- | --- |
| `RILL_SITE_URL` | Your project’s final URL, such as `https://your-rill-project.pages.dev/` |
| `SUPABASE_URL` | The Supabase project’s HTTPS URL |
| `SUPABASE_PUBLISHABLE_KEY` | The project key beginning with `sb_publishable_` |

Cloudflare installs dependencies from `package-lock.json`. The build copies the Supabase browser bundle into `dist` and writes only the public project configuration. The `pages.dev` hostname works for the initial deployment. [Cloudflare’s static HTML deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/)

To build locally, copy [.env.supabase.example](../.env.supabase.example) to `.env.supabase`, set the values and run:

```sh
npm ci
node --env-file=.env.supabase scripts/build-site.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Run the workspace permission check in a test project after applying the migrations. It uses temporary test accounts and rolls back its changes. [Permission check](../supabase/tests/workspace.sql)

Log in with a confirmed email account. Create a workspace and add a zone. Check it from a second browser, then invite another verified account as a viewer and verify it can read the zone. Test an account with a different workspace to confirm its register is separate. Invites are email-bound and expire after seven days. To remove access, delete that user’s membership in `public.rill_memberships` and any unused invites for that email in `rill_private.rill_invites` through Supabase SQL Editor.

## Deploy the sample site to Azure Static Web Apps

1. Create an Azure Static Web Apps resource and connect the GitHub repository and deployment branch. Use a custom static setup with the repository root as the app location and no build output directory. Azure can create the GitHub Actions workflow, or copy `azure-static-web-apps.yml.example` to `.github/workflows/azure-static-web-apps.yml` after provisioning the resource. Store the Azure deployment token as the GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
2. Verify the homepage and `/Technology/`. Sign in with the demo credentials on `/login/` and check that the dashboard opens.
3. Add an owned custom domain through the Static Web Apps domain settings and complete DNS verification. Update canonical links, Open Graph URLs, `sitemap.xml` and `robots.txt` to use the final public origin and path.
4. Apply the business and booking fields described in [owner setup](../OWNER_SETUP.md), then verify them on the deployed website.

See Microsoft’s [Static Web Apps workflow overview](https://learn.microsoft.com/en-us/azure/static-web-apps/overview) and [custom domain setup](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain).

## Optional model service

Use Node 20 or later. Copy the required settings from `.env.azure.example` into the service host’s environment and run `npm run api`. For local development, Node can load a local environment file with `node --env-file=.env.azure service/ai-service.mjs`. The adapter supports the Azure OpenAI Responses API and must have a compatible deployed model and server-side credentials.

Deploy the service separately over HTTPS. Set `AI_ALLOWED_ORIGINS` to the actual website origins and use a service access token when exposing the adapter beyond localhost. Public site files should contain only the documented example values. The browser’s connected-analysis form accepts the service address and access token for an explicitly requested review.

The static header configuration in the sample site applies on Azure Static Web Apps. Live ingestion, model evaluation and telemetry need their respective connected services.
