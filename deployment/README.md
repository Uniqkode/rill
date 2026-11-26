# Deploy the Rill website

GitHub Pages publishes the public website from `main`. The sign-in and dashboard routes open the Cloudflare Pages deployment built from `rill-live-workspace`. [Live workspace deployment guide](https://github.com/Uniqkode/rill/blob/rill-live-workspace/deployment/README.md)

## Optional Azure Static Web Apps deployment

1. Create an Azure Static Web Apps resource and connect the GitHub repository and deployment branch. Use a custom static setup with the repository root as the app location and no build output directory. Azure can create the GitHub Actions workflow, or copy `azure-static-web-apps.yml.example` to `.github/workflows/azure-static-web-apps.yml` after provisioning the resource. Store the Azure deployment token as the GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
2. Verify the homepage and `/Technology/`. Check that `/login/` and `/dashboard/` open the hosted workspace.
3. Add an owned custom domain through the Static Web Apps domain settings and complete DNS verification. Update canonical links, Open Graph URLs, `sitemap.xml` and `robots.txt` to use the final public origin and path.
4. Apply the business and booking fields described in [owner setup](../OWNER_SETUP.md), then verify them on the deployed website.

See Microsoft’s [Static Web Apps workflow overview](https://learn.microsoft.com/en-us/azure/static-web-apps/overview) and [custom domain setup](https://learn.microsoft.com/en-us/azure/static-web-apps/custom-domain).

## Model service

Use Node 20 or later and run `npm run api`. The default address is `http://127.0.0.1:8787`. `POST /api/forecast` runs the same 24-hour demand model and pump allocation as the browser planner. It can run with no provider credentials. `GET /api/health` reports the active forecast model version and training source.

```sh
curl http://127.0.0.1:8787/api/forecast \
  -H 'Content-Type: application/json' \
  --data '{
    "et0Mm": 5.1, "rainMm": 1.5, "waterBudgetM3": 620,
    "flowM3h": 75, "pumpHours": 7.5, "efficiencyPct": 85,
    "zones": [{
      "name": "North pivot", "stage": "reproductive", "areaHa": 2.4,
      "moisturePct": 21, "targetPct": 25, "rootDepthCm": 45, "readingAgeHours": 2
    }]
  }'
```

Use `establishment`, `vegetative`, `reproductive` or `maturation` for the crop stage. Enter reference evapotranspiration and effective rainfall for the next 24 hours in millimetres. Water supply and pump capacity apply across the zones in a request. The response includes gross demand, allocated volume, shortfall, pump runtime, input flags, and model provenance.

### Train from field history

Prepare a private JSON array of dated observations. Each record includes `observedOn` (YYYY-MM-DD), `stage`, `moisturePct`, `targetPct`, `rootDepthCm`, `et0Mm`, `rainMm` and `requiredMm`. Use the independently reviewed net refill depth at the root zone for `requiredMm`. Historical pump delivery can reflect supply limits and is a poor label for water demand.

```sh
npm run train:forecast -- /path/to/field-history.json /path/to/field-model.json
RILL_FORECAST_MODEL_PATH=/path/to/field-model.json npm run api
```

The trainer fits on earlier dates and evaluates mean absolute error against a water-balance baseline on the latest 20% of distinct dates. Check performance by crop, site and weather window before using model outputs in a field pilot. Keep the observations and farm-trained artifact off the public website. The public planner ships with the simulated model.

### Optional evidence review

`POST /api/analyze` uses a separate provider to summarize supplied evidence. Configure it with `.env.azure.example` and a compatible Azure OpenAI Responses API deployment, or with the OpenAI provider. For local development, Node can load the configuration with `node --env-file=.env.azure service/ai-service.mjs`.

When exposing the service beyond localhost, serve it over HTTPS, set `AI_ALLOWED_ORIGINS` to the actual website origins and configure `AI_SERVICE_TOKEN`. Send it as a bearer token. Provider credentials belong in the server environment.

The static header configuration applies on Azure Static Web Apps. Identity, data ingestion, tenant storage, model evaluation and telemetry must be configured and validated for the production deployment.
