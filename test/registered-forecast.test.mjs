import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequest } from '../functions/api/forecast.js';
import { forecastIrrigation } from '../service/irrigation-forecast.mjs';
import { irrigationModel } from '../service/irrigation-model.mjs';

const env = {
  SUPABASE_URL: 'https://rill-test.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
};
const session = 'Bearer test.header.signature';
const input = {
  workspaceId: '688cdbd7-e1b8-40ea-b01e-b0354b926086',
  et0Mm: 5.1, rainMm: 1.5, waterBudgetM3: 620, flowM3h: 75, pumpHours: 7.5, efficiencyPct: 85,
  zones: [
    { name: 'North pivot', stage: 'reproductive', areaHa: 2.4, moisturePct: 21, targetPct: 25, rootDepthCm: 45, readingAgeHours: 2 },
  ],
};

function request({ authorization = session, body = input, contentType = 'application/json' } = {}) {
  const headers = { 'Content-Type': contentType };
  if (authorization) headers.Authorization = authorization;
  return new Request('https://rill.example/api/forecast', {
    method: 'POST', headers, body: JSON.stringify(body),
  });
}

test('forecast rejects guests and publishable keys as sessions', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => assert.fail('Guest should not reach membership lookup'));
  for (const authorization of [null, `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`]) {
    const response = await onRequest({ request: request({ authorization }), env });
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('expired sessions, nonmembers and membership outages cannot run a forecast', async t => {
  const responses = [new Response(null, { status: 401 }), Response.json([]), new Response(null, { status: 500 })];
  t.mock.method(globalThis, 'fetch', async () => responses.shift());
  for (const expected of [401, 403, 503]) {
    const response = await onRequest({ request: request(), env });
    assert.equal(response.status, expected);
    assert.ok(!(await response.json()).zones);
  }
});

test('a registered workspace viewer can use the forecast without a paid plan', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.origin, env.SUPABASE_URL);
    assert.equal(url.pathname, '/rest/v1/rill_memberships');
    assert.equal(url.searchParams.get('workspace_id'), `eq.${input.workspaceId}`);
    assert.equal(url.searchParams.get('select'), 'role');
    assert.equal(options.headers.Authorization, session);
    assert.equal(options.headers.apikey, env.SUPABASE_PUBLISHABLE_KEY);
    return Response.json([{ role: 'viewer' }]);
  });
  const response = await onRequest({ request: request(), env });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const { model, generatedAt, ...plan } = await response.json();
  const expected = forecastIrrigation(input, irrigationModel);
  assert.deepEqual(plan, Object.fromEntries(Object.entries(expected).filter(([key]) => key !== 'model')));
  assert.deepEqual(model, { ...expected.model, baselineOffsetMm: irrigationModel.intercept });
  assert.ok(Number.isFinite(Date.parse(generatedAt)));
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('forecast bounds request bodies and requires a workspace and JSON', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => assert.fail('Invalid input should not reach membership lookup'));
  const tooLarge = await onRequest({ request: request({ body: { padding: 'a'.repeat(129 * 1024) } }), env });
  assert.equal(tooLarge.status, 413);
  const badContent = await onRequest({ request: request({ contentType: 'text/plain' }), env });
  assert.equal(badContent.status, 415);
  const noWorkspace = await onRequest({ request: request({ body: { ...input, workspaceId: null } }), env });
  assert.equal(noWorkspace.status, 400);
  assert.equal(fetchMock.mock.callCount(), 0);
});
