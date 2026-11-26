export const CROP_STAGES = {
  establishment: 'Establishment',
  vegetative: 'Vegetative',
  reproductive: 'Flowering / fruiting',
  maturation: 'Maturation',
};

export const MAX_ZONES = 200;
export const MAX_READING_AGE_HOURS = 24;
export const FIELD_SPECS = {
  et0Mm: { label: 'Reference evapotranspiration (mm)', min: 0, max: 25, step: 0.1 },
  rainMm: { label: 'Effective rainfall (mm)', min: 0, max: 300, step: 0.1 },
  waterBudgetM3: { label: 'Available water (m³)', min: 0, max: 1_000_000, step: 0.1 },
  flowM3h: { label: 'Pump flow (m³/h)', min: 0.1, max: 10_000, step: 0.1 },
  pumpHours: { label: 'Pump window (hours)', min: 0, max: 24, step: 0.1 },
  efficiencyPct: { label: 'Application efficiency (%)', min: 1, max: 100, step: 1 },
  areaHa: { label: 'Area (ha)', min: 0.01, max: 10_000, step: 0.01 },
  moisturePct: { label: 'Soil moisture (%)', min: 0, max: 100, step: 0.1 },
  targetPct: { label: 'Refill target (%)', min: 0, max: 100, step: 0.1 },
  rootDepthCm: { label: 'Root depth (cm)', min: 1, max: 300, step: 1 },
  readingAgeHours: { label: 'Reading age (hours)', min: 0, max: 8760, step: 0.1 },
};

const stageKeys = Object.keys(CROP_STAGES);
export const FEATURE_KEYS = ['soilDeficitMm', ...stageKeys, 'rainMm'];
export const DOMAIN_KEYS = ['soilDeficitMm', 'et0Mm', 'rainMm'];

function number(input, key) {
  const value = input?.[key];
  const { label, min, max } = FIELD_SPECS[key];
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`Enter ${label.toLowerCase()} between ${min} and ${max}.`);
  }
  return value;
}

export function demandFeatures(input) {
  const moisture = number(input, 'moisturePct');
  const target = number(input, 'targetPct');
  const rootDepth = number(input, 'rootDepthCm');
  const et0Mm = number(input, 'et0Mm');
  const rainMm = number(input, 'rainMm');
  if (typeof input.stage !== 'string' || !Object.hasOwn(CROP_STAGES, input.stage)) {
    throw new RangeError('Choose a crop stage.');
  }

  const soilDeficitMm = Math.max(0, target - moisture) * rootDepth / 10;
  const cropEt = stageKeys.map(stage => stage === input.stage ? et0Mm : 0);
  return { values: [soilDeficitMm, ...cropEt, rainMm], domain: { soilDeficitMm, et0Mm, rainMm } };
}

export function demandDepth(model, features) {
  const contributions = features.map((value, index) => value * model.coefficients[index]);
  const rawMm = contributions.reduce((sum, value) => sum + value, model.intercept);
  return { netMm: Math.max(0, rawMm), rawMm, contributions };
}

export function validateDemandModel(model) {
  if (model?.schema !== 1 || typeof model.version !== 'string' || !/^[a-z0-9-]{1,80}$/.test(model.version)
      || !['simulation', 'field-history'].includes(model.trainingSource)
      || !Number.isFinite(model.intercept) || Math.abs(model.intercept) > 1000
      || !Array.isArray(model.coefficients) || model.coefficients.length !== FEATURE_KEYS.length
      || model.coefficients.some(value => !Number.isFinite(value) || Math.abs(value) > 100)
      || !Array.isArray(model.stages) || !model.stages.length || model.stages.some(stage => !stageKeys.includes(stage))
      || DOMAIN_KEYS.some(key => {
        const range = model.domain?.[key];
        return !Array.isArray(range) || range.length !== 2 || range.some(value => !Number.isFinite(value))
          || range[0] < 0 || range[0] > range[1];
      })) {
    throw new Error('Invalid irrigation demand model artifact.');
  }
  return model;
}

const volumeScale = 10;

export function forecastIrrigation(input, model) {
  const waterBudgetM3 = number(input, 'waterBudgetM3');
  const flowM3h = number(input, 'flowM3h');
  const pumpHours = number(input, 'pumpHours');
  const efficiencyPct = number(input, 'efficiencyPct');
  const et0Mm = number(input, 'et0Mm');
  const rainMm = number(input, 'rainMm');
  if (!Array.isArray(input.zones) || input.zones.length < 1 || input.zones.length > MAX_ZONES) {
    throw new RangeError(`Provide 1 to ${MAX_ZONES} zones sharing the same pump and weather window.`);
  }

  const names = new Set();
  const predictions = input.zones.map((zone, index) => {
    const name = typeof zone?.name === 'string' ? zone.name.trim() : '';
    if (!name || name.length > 100) throw new RangeError(`Enter a name of up to 100 characters for zone ${index + 1}.`);
    if (names.has(name.toLowerCase())) throw new RangeError(`Use a unique name for each zone. “${name}” appears twice.`);
    names.add(name.toLowerCase());

    try {
      const areaHa = number(zone, 'areaHa');
      const readingAgeHours = number(zone, 'readingAgeHours');
      const { values, domain } = demandFeatures({ ...zone, et0Mm, rainMm });
      const outsideDomain = DOMAIN_KEYS.filter(key => domain[key] < model.domain[key][0] - 1e-9
        || domain[key] > model.domain[key][1] + 1e-9);
      const flags = [];
      if (readingAgeHours > MAX_READING_AGE_HOURS) flags.push('Soil reading is older than 24 hours. Take a new reading.');
      if (!model.stages.includes(zone.stage)) flags.push('This crop stage is outside the model’s training coverage.');
      for (const key of outsideDomain) {
        const label = key === 'soilDeficitMm' ? 'Root-zone deficit (mm)' : FIELD_SPECS[key].label;
        const [min, max] = model.domain[key];
        flags.push(`${label} is outside the training range (${min.toFixed(1)}–${max.toFixed(1)}).`);
      }
      if (flags.length) return { name, rank: null, netMm: null, demandUnits: null, flags };

      const estimate = demandDepth(model, values);
      // 1 mm over 1 ha is 10 m³. Pump volume includes application losses.
      const demandUnits = Math.round(estimate.netMm * areaHa * 10 * (100 / efficiencyPct) * volumeScale);
      const drivers = [
        { label: `Root-zone deficit of ${domain.soilDeficitMm.toFixed(1)} mm`, effectMm: estimate.contributions[0] },
        { label: `${CROP_STAGES[zone.stage]} with ${et0Mm} mm reference ET`, effectMm: estimate.contributions[stageKeys.indexOf(zone.stage) + 1] },
        { label: `Effective rainfall of ${rainMm} mm`, effectMm: estimate.contributions.at(-1) },
      ];
      return { name, netMm: estimate.netMm, demandUnits, drivers, flags };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
      throw new RangeError(`${name}. ${error.message}`);
    }
  });

  const pumpCapacityM3 = flowM3h * pumpHours;
  const capacityUnits = Math.floor(Math.min(waterBudgetM3, pumpCapacityM3) * volumeScale);
  let remainingUnits = capacityUnits;
  let totalDemandUnits = 0;
  let rank = 0;
  const zones = predictions.sort((left, right) => (right.netMm ?? -1) - (left.netMm ?? -1))
    .map(({ demandUnits, ...prediction }) => {
      if (demandUnits === null) {
        return { ...prediction, demandM3: null, allocatedM3: 0, shortfallM3: null, runtimeMinutes: 0, status: 'check-inputs' };
      }
      const allocation = Math.min(demandUnits, remainingUnits);
      remainingUnits -= allocation;
      totalDemandUnits += demandUnits;
      return {
        ...prediction,
        rank: demandUnits > 0 ? ++rank : null,
        demandM3: demandUnits / volumeScale,
        allocatedM3: allocation / volumeScale,
        shortfallM3: (demandUnits - allocation) / volumeScale,
        runtimeMinutes: allocation / volumeScale / flowM3h * 60,
        status: demandUnits === 0 ? 'hold' : allocation === demandUnits ? 'covered' : 'shortfall',
      };
    });

  const allocatedM3 = (capacityUnits - remainingUnits) / volumeScale;
  return {
    model: { version: model.version, trainingSource: model.trainingSource },
    horizonHours: 24,
    demandM3: totalDemandUnits / volumeScale,
    allocatedM3,
    shortfallM3: (totalDemandUnits - capacityUnits + remainingUnits) / volumeScale,
    runtimeMinutes: allocatedM3 / flowM3h * 60,
    capacityM3: capacityUnits / volumeScale,
    limitingResource: waterBudgetM3 <= pumpCapacityM3 ? 'water' : 'pump',
    withheldZones: zones.filter(zone => zone.status === 'check-inputs').length,
    zones,
  };
}
