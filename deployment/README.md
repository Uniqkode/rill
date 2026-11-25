# Deploy Rill’s hosted workspace

The existing static frontend runs on Cloudflare Pages. Supabase Auth handles Google sign-in and Supabase Postgres stores workspaces, roles, irrigation zones and activity. The database checks the signed-in user’s membership on every read and write.

## Supabase

1. Create a Free project. Run [the workspace migration](../supabase/migrations/20261125000100_rill_workspace.sql) in Supabase SQL Editor on that project. Keep `rill_private` out of the Data API’s exposed schemas.
2. Copy the project’s HTTPS URL and the **publishable key** from the API Keys settings. Keep database credentials, secret keys and Google’s client secret out of the static site and repository.
3. Enable Google under Supabase Authentication providers. Create a Web application OAuth client in Google Cloud and add the Supabase callback URI shown in the provider settings, such as `https://your-project-ref.supabase.co/auth/v1/callback`. Add the deployed website origin in the OAuth client settings and enter its client ID and secret in Supabase.
4. Set the Supabase Auth Site URL to your Cloudflare Pages URL and add its exact `/login/` URL to the Auth redirect allow list. Add a local URL such as `http://127.0.0.1:4173/login/` when testing locally. Set the Google consent screen to the audience who can sign in.

See the [Supabase Google sign-in guide](https://supabase.com/docs/guides/auth/social-sign-in/auth-google) and the [Supabase Auth redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

## Cloudflare Pages

Create a Pages project linked to this GitHub repository. Set its production branch to the branch containing the workspace code, build command to `npm run build`, output directory to `dist`, and Node version to 22 or later. Set these build environment variables:

| Variable | Value |
| --- | --- |
| `RILL_SITE_URL` | Your project’s final URL, such as `https://your-rill-project.pages.dev/` |
| `SUPABASE_URL` | The Supabase project’s HTTPS URL |
| `SUPABASE_PUBLISHABLE_KEY` | The project key beginning with `sb_publishable_` |

Cloudflare installs the pinned Supabase browser SDK declared in `package.json`. The build copies its browser bundle into `dist` and writes only the public project configuration. The `pages.dev` hostname works for the initial deployment. See [Cloudflare’s static HTML deployment guide](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/).

To build locally, copy [.env.supabase.example](../.env.supabase.example) to `.env.supabase`, set the values and run:

```sh
npm install
node --env-file=.env.supabase scripts/build-site.mjs
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Run the [workspace permission check](../supabase/tests/workspace.sql) in a test project after applying the migration. It uses temporary test accounts and rolls back its changes.

Use the Google account you configured to sign in. Create a workspace and add a zone. Check it from a second browser, then invite a separate Google account as a viewer and verify it can read the zone. Test an account with a different workspace to confirm its register is separate. Invites are email-bound and expire after seven days. To remove access, delete that user’s membership from `rill_memberships` and any unused invites for that email from `rill_invites` in Supabase.

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
