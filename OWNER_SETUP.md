# Rill owner setup

The standalone website reads its public company settings from `window.BRAND.company` in `assets/config.js`. Edit those settings directly and redeploy the static files. Use real published details that the business owns or has permission to use.

| Configuration | How the website uses it |
| --- | --- |
| `bookingUrl`, `bookingVerified` | Set `bookingUrl` to an actual HTTPS Calendly event URL and set `bookingVerified` to `true`. The homepage and Contact page display a scheduler and a direct booking link. Until configured, Contact prepares a walkthrough request for submission on GitHub. |
| `contactEmail`, `contactVerified` | Set a monitored business inbox and set `contactVerified` to `true`. Contact opens a draft in the visitor’s email app. |
| `legalName`, `rcNumber`, `headquarters`, `registrationEvidence`, `registrationVerified` | Provide the registered operating name, registration number without the `RC` prefix, headquarters city and a verification reference. Set `registrationVerified` to `true` once checked. The website publishes the identity, number and city. |
| `team[0].linkedin` | Provide the maintainer’s actual public LinkedIn profile URL. The website uses the GitHub profile until a LinkedIn profile is configured. |
| `team` | Add verified teammates with `name`, `role`, `bio`, optional `linkedin` and `verified: true`. About and the homepage display verified additional entries. |
| `azureDeploymentVerified`, `azureDeploymentEvidence` | Set the deployment flag and provide an HTTPS evidence reference once the application is deployed on Azure. The footer then credits Microsoft Azure. |
| `usage` | Provide an object with `verified: true`, `periodStart` and `periodEnd` as ISO calendar dates, `activeOrganizations` and `forecasts` as positive whole counts, and `sourceUrl` as a public HTTPS usage report. The recorded period and figures appear on the homepage. |

Keep any Azure credential or service access token in the backend environment. The public company configuration is readable by visitors. Publish telemetry aggregates and evidence links approved for public viewing.

## Walkthrough requests

The Contact form prepares a draft with the requested workflow, preferred time and plan where applicable. It opens GitHub for public issues or the visitor’s email app when a verified inbox is configured. The visitor submits the request. An embedded Calendly event handles confirmed bookings when configured.

## Commercial plans

Starter is proposed at $499 per month for 10,000 zone forecasts and five operators. Growth is proposed at $1,499 per month for 50,000 forecasts and 15 operators. Enterprise is quoted. The annual option uses a 20% reduction on the monthly rate and shows the total billed annually. Review pricing, taxes, onboarding and usage terms before accepting a commercial order. The separate review-time calculator accepts estimated staff costs in NGN.

## Launch checks

- Test the configured booking event through the public homepage and Contact.
- Confirm the canonical URLs, sitemap and robots reference match the deployed origin and path.
- Validate forecast error, data access, retention, alerting and measured capacity with the operating team before enabling organizational processing.
