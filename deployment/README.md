# Deploy Rill to Azure Static Web Apps

1. Create an Azure Static Web Apps resource and connect the GitHub repository and deployment branch. Use a custom static setup with the repository root as the app location and no build output directory. Azure can create the GitHub Actions workflow, or copy `azure-static-web-apps.yml.example` to `.github/workflows/azure-static-web-apps.yml` after provisioning the resource. Store the Azure deployment token as the GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
2. Verify the homepage and direct routes, including `/Technology/`, `/login/` and `/dashboard/?demo=1`.
3. Add an owned custom domain through the Static Web Apps domain settings and complete DNS verification. Update canonical links, Open Graph URLs, `sitemap.xml` and `robots.txt` to use the final public origin and path.
4. Apply the business and booking fields described in [owner setup](../OWNER_SETUP.md), then verify them on the deployed website.

See Microsoft’s [Static Web Apps workflow overview](https://learn.microsoft.com/en-us/azure/static-web-apps/overview) and [custom domain setup](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain).

## Optional model service

Use Node 20 or later. Copy the required settings from `.env.azure.example` into the service host’s environment and run `npm run api`. For local development, Node can load a local environment file with `node --env-file=.env.azure service/ai-service.mjs`. The adapter supports the Azure OpenAI Responses API and must have a compatible deployed model and server-side credentials.

Deploy the service separately over HTTPS. Set `AI_ALLOWED_ORIGINS` to the actual website origins and use a service access token when exposing the adapter beyond localhost. Public site files should contain only the documented example values. The browser’s connected-analysis form accepts the service address and access token for an explicitly requested review.

The static header configuration applies on Azure Static Web Apps. Identity, data ingestion, tenant storage, model evaluation and telemetry must be configured and validated for the production deployment.
