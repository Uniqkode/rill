# Rill

Rill is irrigation-planning software for commercial farms, irrigation cooperatives and irrigation service teams. It brings soil readings, weather forecasts, crop stage and pump capacity into a daily zone plan for operator review.

## Run the website

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [Rill](http://127.0.0.1:4173/). The website uses static HTML, CSS and JavaScript. It requires no framework build or package installation. Serve it over HTTP so the calculators can load their JavaScript modules.

The main routes are `/home/`, `/pricing/`, `/security/`, `/about/`, `/legal/`, `/solution/`, `/problem/` and `/Technology/`. The homepage is also available at `/`. Keep the capital `T` in `/Technology/` when deploying to a case-sensitive host. Operational pages include `/login/` and `/dashboard/`.

## Hosted workspace

Rill supports email and password sign-in, shared irrigation zones, workspace roles and database-backed change history. The hosted build starts with an empty register in each new workspace. Owners can share a time-limited invite link with an operator or viewer. [Supabase and Cloudflare setup](deployment/README.md)

## Explore the sample workspace

- Sign in with `demo@rill.example` and `MVPdemo2026!`.
- Check the water-allocation chart and review queue in **Overview**. Open **Forecast review** to run a prepared case, check its sources and download a dated report.
- Open **Zones** to search and filter records, create a zone, update a note or record a watering outcome. Open **Reports** to view dated activity and export the zone register.
- Use the water-budget calculator on **Product**, the review-time calculator on **Pricing** and the forecast-capacity calculator on **Technology**.

The public sample uses prepared data. Records, reports and recent activity persist in the current browser. The operator reviews every watering decision and runs the pump separately.

## Design and assets

The visual identity uses deep forest `#101E14`, sage `#E9F2E5`, and lime `#D2F77C`, with amber for zones that need review. The homepage pairs an aerial illustration with clickable zones from the sample register. The main typography is Inter. Font and image attribution is in `assets/INTER-LICENSE.txt`, `assets/FONT-LICENSES.txt`, `assets/image-sources.json`, `assets/editorial-sources.json` and the Terms page.

## Azure deployment

The Technology page maps field telemetry to IoT Hub, scanned logs to Azure Document Intelligence, zone forecasts to Azure Machine Learning, and explanation briefs to the Azure OpenAI adapter. Its reference deployment also covers Static Web Apps, Blob Storage, Entra ID, Key Vault, Private Link, monitoring and an AKS option if measured inference demand warrants it.

The capacity calculator models 80 farms × 60 zones × 4 updates per day × 30 days as 576,000 forecasts in a 30-day period. Actual throughput and forecast quality depend on the deployment and field evaluation.

See [deployment setup](deployment/README.md) for Azure Static Web Apps, a custom domain and the optional Node model service. See [owner setup](OWNER_SETUP.md) for a Calendly event, company details and reporting supported by evidence.
