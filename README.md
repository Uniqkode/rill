# Rill

Rill is AI irrigation-planning software for commercial farms, cooperatives and irrigation service teams. It predicts 24-hour water demand by zone and proposes a watering order within the team's water supply and shared pump window.

## Run the website

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [Rill](http://127.0.0.1:4173/). The website uses static HTML, CSS and JavaScript. It requires no framework build or package installation. Serve it over HTTP so the calculators can load their JavaScript modules.

The main routes are `/home/`, `/pricing/`, `/security/`, `/about/`, `/legal/`, `/solution/`, `/problem/` and `/Technology/`. The homepage is also available at `/`. Keep the capital `T` in `/Technology/` when deploying to a case-sensitive host. Operational pages include `/login/` and `/dashboard/`.

## Hosted workspace

Rill supports email and password sign-in, shared irrigation zones, workspace roles and database-backed change history. The hosted build starts with an empty register in each new workspace. Open **AI forecast** to select zones from the register, enter readings and pump limits, and export the suggested 24-hour plan. Owners can share a time-limited invite link with an operator or viewer. [Supabase and Cloudflare setup](deployment/README.md)

## Explore the sample workspace

- Sign in with `demo@rill.example` and `MVPdemo2026!`.
- Check the water-allocation chart and review queue in **Overview**. Open the forecast tab to inspect the prepared evidence review. Use a registered workspace account to run the forecast model.
- Open **Zones** to search and filter records, create a zone, update a note or record a watering outcome. Open **Reports** to view dated activity and export the zone register.
- Use the water-budget calculator on **Product**, the review-time calculator on **Pricing** and the forecast-capacity calculator on **Technology**.

The public sample uses prepared data. Records, reports and recent activity persist in the current browser. The operator reviews every watering decision and runs the pump separately.

## Run a forecast

Sign in to Rill, open **AI forecast** in your workspace and choose a sample farm or workspace zones. Change the weather or soil readings to see demand change. Change the available water or pump window to see how much of that demand can be served. The planner supports up to 200 zones sharing a pump and weather window, shows which factors drove each forecast, and exports a dated CSV with the model version and inputs.

The built-in constrained ridge regression was trained on simulated irrigation observations. Its evaluation uses later dates in the simulation. The irrigation team reviews all suggestions and operates the pump. Use field history and a local pilot to establish accuracy for a commercial deployment.

Run `npm test` for forecast and API checks or `npm run train:forecast` to reproduce the bundled model. The [model service guide](deployment/README.md#model-service) covers server inference and training on field records.

## Design and assets

The visual identity uses deep forest `#101E14`, sage `#E9F2E5`, and lime `#D2F77C`, with amber for zones that need review. The homepage pairs an aerial illustration with clickable zones from the sample register. The main typography is Inter. Font and image attribution is in `assets/INTER-LICENSE.txt`, `assets/FONT-LICENSES.txt`, `assets/image-sources.json`, `assets/editorial-sources.json` and the Terms page.

## Azure deployment

The hosted planner checks workspace membership when you run a forecast. The repository also includes a local Node model service. The roadmap outlines the planned Azure integration for connected field telemetry, model training, batch inference and operator review.

The capacity calculator models 80 farms × 60 zones × 4 updates per day × 30 days as 576,000 forecasts in a 30-day period. Actual throughput and forecast quality depend on the deployment and field evaluation.

See [deployment setup](deployment/README.md) for Azure Static Web Apps, a custom domain and the optional Node model service. See [owner setup](OWNER_SETUP.md) for a Calendly event, company details and reporting supported by evidence.
