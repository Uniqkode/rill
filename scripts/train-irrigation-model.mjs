import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { DOMAIN_KEYS, demandDepth, demandFeatures, validateDemandModel } from '../service/irrigation-forecast.mjs';
import { CROP_STAGES } from '../assets/forecast-inputs.js';

const stages = Object.keys(CROP_STAGES);
const cropFactors = [0.45, 0.8, 1.15, 0.65];
const round = value => Number(value.toFixed(6));

// The built-in dataset simulates different soils, crops, and weather windows.
// Required depth here is a simulated outcome. It represents net water at the root zone.
function simulatedObservations() {
  let state = 17425;
  function random() {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 2 ** 32;
  }

  const rows = [];
  for (let day = 0; day < 120; day++) {
    const observedOn = new Date(Date.UTC(2025, 0, day + 1)).toISOString().slice(0, 10);
    const et0Mm = Math.max(0, Math.round((1 + random() * 7 + 1.2 * Math.sin(day / 25)) * 10) / 10);
    const rainMm = random() < 0.43 ? Math.round(random() * 32 * 10) / 10 : 0;
    for (let zone = 0; zone < 16; zone++) {
      const stageIndex = (Math.floor(day / 26) + zone) % stages.length;
      const stage = stages[stageIndex];
      const targetPct = 23 + (zone % 7);
      const rootDepthCm = 20 + (zone % 6) * 8 + stageIndex * 4;
      const moisturePct = Math.round((targetPct + 4 - random() * 16) * 10) / 10;
      const deficit = Math.max(0, targetPct - moisturePct) * rootDepthCm / 10;
      const localRefill = 0.68 + 0.05 * (zone % 4);
      const cropDemand = cropFactors[stageIndex] * et0Mm * (0.9 + random() * 0.26);
      const rainCredit = rainMm * (0.83 + random() * 0.17);
      const variation = (random() - 0.5) * 3;
      const requiredMm = round(Math.max(0, localRefill * deficit + cropDemand - rainCredit + variation));
      rows.push({ observedOn, stage, targetPct, rootDepthCm, moisturePct, et0Mm, rainMm, requiredMm });
    }
  }
  return rows;
}

function prepare(records) {
  if (!Array.isArray(records) || records.length < 30) throw new Error('Provide at least 30 dated observations.');
  return records.map((row, index) => {
    const date = new Date(`${row?.observedOn}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== row.observedOn
        || !Number.isFinite(row.requiredMm) || row.requiredMm < 0 || row.requiredMm > 1000) {
      throw new Error(`Observation ${index + 1} needs a valid observedOn date (YYYY-MM-DD) and requiredMm (0–1000).`);
    }
    try {
      return { ...demandFeatures(row), date: row.observedOn, stage: row.stage, target: row.requiredMm };
    } catch (error) {
      throw new Error(`Observation ${index + 1}. ${error.message}`);
    }
  }).sort((left, right) => left.date.localeCompare(right.date));
}

function fit(training) {
  const scales = training[0].values.map((_, index) => training.reduce((max, row) => Math.max(max, row.values[index]), 1));
  const initial = [0, ...[1, ...cropFactors, -1].map((weight, index) => weight * scales[index])];
  const weights = [...initial];
  const design = training.map(row => ({
    values: [1, ...row.values.map((value, index) => value / scales[index])],
    target: row.target,
  }));

  // Squared loss with ridge regularization toward the water-balance baseline.
  // At zero observed demand, predictions are censored at zero for the loss.
  for (let iteration = 0; iteration < 1600; iteration++) {
    const gradient = weights.map(() => 0);
    for (const row of design) {
      const prediction = row.values.reduce((sum, value, index) => sum + value * weights[index], 0);
      const error = (row.target === 0 ? Math.max(0, prediction) : prediction) - row.target;
      for (let index = 0; index < weights.length; index++) gradient[index] += error * row.values[index];
    }
    for (let index = 0; index < weights.length; index++) {
      const penalty = index === 0 ? 0 : 0.0001 * (weights[index] - initial[index]);
      weights[index] -= 0.22 * (gradient[index] / design.length + penalty);
    }
    // Drier soil and higher evaporative demand can increase need. Rain can reduce it.
    for (let index = 1; index < weights.length - 1; index++) weights[index] = Math.max(0, weights[index]);
    weights[weights.length - 1] = Math.min(0, weights.at(-1));
  }

  return {
    intercept: round(weights[0]),
    coefficients: scales.map((scale, index) => round(weights[index + 1] / scale)),
  };
}

function evaluate(model, rows) {
  const errors = rows.map(row => Math.abs(demandDepth(model, row.values).netMm - row.target));
  return round(errors.reduce((sum, error) => sum + error, 0) / errors.length);
}

function train(records, trainingSource) {
  const rows = prepare(records);
  const dates = [...new Set(rows.map(row => row.date))];
  if (dates.length < 5) throw new Error('Provide observations from at least five distinct dates.');
  const cutoff = dates[Math.floor(dates.length * 0.8)];
  const training = rows.filter(row => row.date < cutoff);
  const holdout = rows.slice(training.length);
  if (training.length < 25 || holdout.length < 5 || !training.some(row => row.target > 0)) {
    throw new Error('The earlier dates need at least 25 observations with some positive demand. Supply at least five observations for the later dates.');
  }

  const model = {
    schema: 1,
    trainingSource,
    method: 'Constrained ridge regression',
    ...fit(training),
    stages: stages.filter(stage => training.filter(row => row.stage === stage).length >= 5),
    domain: Object.fromEntries(DOMAIN_KEYS.map(key => {
      const range = training.reduce(([min, max], row) => [Math.min(min, row.domain[key]), Math.max(max, row.domain[key])], [Infinity, -Infinity]);
      return [key, range.map(round)];
    })),
    trainingRows: training.length,
    validation: {
      from: cutoff,
      rows: holdout.length,
      baselineMaeMm: evaluate({ intercept: 0, coefficients: [1, ...cropFactors, -1] }, holdout),
    },
  };
  model.validation.maeMm = evaluate(model, holdout);
  const revision = createHash('sha256').update(JSON.stringify(model)).digest('hex').slice(0, 10);
  return validateDemandModel({ version: `rill-demand-v1-${revision}`, ...model });
}

const [historyPath, outputPath] = process.argv.slice(2);
if (historyPath && (!outputPath || !outputPath.endsWith('.json'))) {
  throw new Error('Usage: npm run train:forecast -- path/to/history.json path/to/private-model.json');
}
const observations = historyPath ? JSON.parse(await readFile(historyPath, 'utf8')) : simulatedObservations();
const model = train(observations, historyPath ? 'field-history' : 'simulation');
const artifact = JSON.stringify(model, null, 2);
if (historyPath) {
  await writeFile(outputPath, `${artifact}\n`, { mode: 0o600, flag: 'wx' });
} else {
  await writeFile(new URL('../service/irrigation-model.mjs', import.meta.url),
    `// Generated by npm run train:forecast using simulated observations.\nexport const irrigationModel = ${artifact};\n`);
}
console.log(`${model.version} · ${model.trainingRows} training rows · ${model.validation.rows} later holdout rows`);
console.log(`Holdout MAE ${model.validation.maeMm.toFixed(2)} mm · water-balance baseline ${model.validation.baselineMaeMm.toFixed(2)} mm`);
