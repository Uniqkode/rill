export const CROP_STAGES = {
  establishment: 'Establishment',
  vegetative: 'Vegetative',
  reproductive: 'Flowering / fruiting',
  maturation: 'Maturation',
};

export const MAX_ZONES = 200;
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
