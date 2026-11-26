import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { forecastIrrigation, validateDemandModel } from '../service/irrigation-forecast.mjs';
import { irrigationModel } from '../service/irrigation-model.mjs';
import { createAIService } from '../service/ai-service.mjs';

const input = {
  et0Mm: 5.1, rainMm: 1.5, waterBudgetM3: 620, flowM3h: 75, pumpHours: 7.5, efficiencyPct: 85,
  zones: [
    { name: 'Small dry zone', stage: 'reproductive', areaHa: 2.4, moisturePct: 21, targetPct: 25, rootDepthCm: 45, readingAgeHours: 2 },
    { name: 'Large moist zone', stage: 'vegetative', areaHa: 8, moisturePct: 24, targetPct: 26, rootDepthCm: 30, readingAgeHours: 3 },
  ],
};
const forecast = changes => forecastIrrigation({ ...input, ...changes }, irrigationModel);

test('field signals affect learned demand, independently of the pump window', () => {
  validateDemandModel(irrigationModel);
  const dry = forecast({});
  const rainy = forecast({ rainMm: 12 });
  assert.ok(rainy.demandM3 < dry.demandM3);
  assert.equal(rainy.zones[1].status, 'hold');
  assert.equal(dry.zones[0].name, 'Small dry zone');
  assert.ok(dry.zones[0].demandM3 < dry.zones[1].demandM3);

  const shortWindow = forecast({ pumpHours: 2 });
  assert.equal(shortWindow.demandM3, dry.demandM3);
  assert.equal(shortWindow.allocatedM3, 150);
  assert.equal(shortWindow.limitingResource, 'pump');
  assert.equal(shortWindow.runtimeMinutes, 120);
  assert.equal(shortWindow.zones[1].allocatedM3, 0);

  const shortSupply = forecast({ waterBudgetM3: 100.16 });
  assert.equal(shortSupply.allocatedM3, 100.1);
  assert.equal(shortSupply.limitingResource, 'water');
  assert.equal(forecast({ pumpHours: 0 }).allocatedM3, 0);
});

test('stale readings and out-of-range conditions withhold water from affected zones', () => {
  const stale = forecast({ zones: [{ ...input.zones[0], readingAgeHours: 25 }, input.zones[1]] });
  assert.equal(stale.withheldZones, 1);
  assert.equal(stale.zones[0].name, 'Large moist zone');
  const excluded = stale.zones[1];
  assert.equal(excluded.demandM3, null);
  assert.equal(excluded.allocatedM3, 0);
  assert.equal(excluded.status, 'check-inputs');
  assert.match(excluded.flags[0], /older than 24 hours/);

  const outOfRange = forecast({ rainMm: 100 });
  assert.equal(outOfRange.withheldZones, 2);
  assert.equal(outOfRange.allocatedM3, 0);
  assert.ok(outOfRange.zones.every(zone => zone.flags.some(flag => flag.includes('outside the training range'))));
  assert.throws(() => forecast({ rainMm: null }), /rainfall/);
  assert.throws(() => forecast({ zones: [input.zones[0], input.zones[0]] }), /unique name/);
});

test('forecast API uses the same model and works with evidence review unconfigured', async t => {
  const api = createAIService({ providerName: 'openai', key: '', forecastModel: irrigationModel, accessToken: 'forecast-test-token' });
  api.listen(0, '127.0.0.1');
  t.after(() => api.close());
  await once(api, 'listening');
  const url = `http://127.0.0.1:${api.address().port}`;
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer forecast-test-token' };
  const post = (route, body, requestHeaders = headers) => fetch(url + route, {
    method: 'POST', headers: requestHeaders, body: JSON.stringify(body),
  });

  assert.equal((await post('/api/forecast', input, { 'Content-Type': 'application/json' })).status, 401);
  assert.equal((await post('/api/analyze', {})).status, 503);
  assert.equal((await post('/api/forecast', { ...input, pumpHours: 25 })).status, 400);
  const response = await post('/api/forecast', input);
  assert.equal(response.status, 200);
  const { generatedAt, ...plan } = await response.json();
  assert.ok(Number.isFinite(Date.parse(generatedAt)));
  assert.deepEqual(plan, forecast({}));
});
