import { forecastIrrigation } from '../../service/irrigation-forecast.mjs';
import { irrigationModel } from '../../service/irrigation-model.mjs';

const maxBodyBytes = 128 * 1024;
const workspaceIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const sessionPattern = /^Bearer [\w-]+\.[\w-]+\.[\w-]+$/i;
const roles = new Set(['owner', 'operator', 'viewer']);

function json(status, body, headers = {}) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers },
  });
}

async function readInputs(request) {
  if (!request.body) throw new SyntaxError('Missing request body');
  const decoder = new TextDecoder();
  const reader = request.body.getReader();
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(text + decoder.decode());
      bytes += value.byteLength;
      if (bytes > maxBodyBytes) {
        await reader.cancel();
        throw new RangeError('Forecast inputs exceed the request size limit.');
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
}

export async function onRequest({ request, env }) {
  if (request.method !== 'POST') return json(405, { error: 'Submit forecast inputs with POST.' }, { Allow: 'POST' });
  const authorization = request.headers.get('Authorization') || '';
  if (!sessionPattern.test(authorization)) return json(401, { error: 'Sign in to run an irrigation forecast.' });
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return json(415, { error: 'Send the forecast inputs as JSON.' });
  }

  let input;
  try {
    input = await readInputs(request);
  } catch (error) {
    if (error instanceof RangeError) return json(413, { error: 'Forecast inputs exceed the request size limit.' });
    return json(400, { error: 'Forecast inputs must be valid JSON.' });
  }
  if (typeof input?.workspaceId !== 'string' || !workspaceIdPattern.test(input.workspaceId)) {
    return json(400, { error: 'Choose a workspace for this forecast.' });
  }

  try {
    const membershipUrl = new URL('/rest/v1/rill_memberships', env.SUPABASE_URL);
    membershipUrl.searchParams.set('select', 'role');
    membershipUrl.searchParams.set('workspace_id', `eq.${input.workspaceId}`);
    membershipUrl.searchParams.set('limit', '1');
    // The Data API validates the user's token. The membership policy only returns rows for that user.
    const response = await fetch(membershipUrl, {
      headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY, Authorization: authorization },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    });
    if (response.status === 401) return json(401, { error: 'Sign in again to run an irrigation forecast.' });
    if (response.status === 403) return json(403, { error: 'Join this workspace to run its forecasts.' });
    if (response.status === 429) return json(429, { error: 'Too many requests. Wait a moment and try again.' });
    if (!response.ok) throw new Error('Membership check failed');
    const memberships = await response.json();
    if (!Array.isArray(memberships) || !roles.has(memberships[0]?.role)) {
      return json(403, { error: 'Join this workspace to run its forecasts.' });
    }
  } catch {
    return json(503, { error: 'Rill could not check your workspace access. Try again in a moment.' });
  }

  try {
    const plan = forecastIrrigation(input, irrigationModel);
    return json(200, {
      ...plan,
      model: { ...plan.model, baselineOffsetMm: irrigationModel.intercept },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof RangeError) return json(400, { error: error.message });
    return json(500, { error: 'Rill could not calculate this forecast. Try again.' });
  }
}
