import { CROP_STAGES, FIELD_SPECS, MAX_ZONES } from './forecast-inputs.js';

const weatherFields = ['et0Mm', 'rainMm'];
const pumpFields = ['waterBudgetM3', 'flowM3h', 'pumpHours', 'efficiencyPct'];
const zoneFields = ['areaHa', 'moisturePct', 'targetPct', 'rootDepthCm', 'readingAgeHours'];
const example = {
  et0Mm: 5.1,
  rainMm: 1.5,
  waterBudgetM3: 620,
  flowM3h: 75,
  pumpHours: 7.5,
  efficiencyPct: 85,
  zones: [
    { name: 'North pivot · Tomato', stage: 'reproductive', areaHa: 2.4, moisturePct: 21, targetPct: 25, rootDepthCm: 45, readingAgeHours: 2 },
    { name: 'West block · Onion', stage: 'vegetative', areaHa: 1.6, moisturePct: 24, targetPct: 26, rootDepthCm: 30, readingAgeHours: 3 },
    { name: 'Nursery · Cabbage', stage: 'establishment', areaHa: 0.8, moisturePct: 27.5, targetPct: 26, rootDepthCm: 20, readingAgeHours: 2 },
  ],
};
const statusLabels = { covered: 'Demand covered', shortfall: 'Supply shortfall', hold: 'No irrigation indicated', 'check-inputs': 'Check inputs' };
const format = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const signed = new Intl.NumberFormat('en', { maximumFractionDigits: 1, signDisplay: 'exceptZero' });
const fmt = value => value === null ? '—' : format.format(value);
const esc = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

function field(key, values = {}) {
  const { label, min, max, step } = FIELD_SPECS[key];
  return `<label>${label}<input name="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${values[key] ?? ''}" required></label>`;
}

function numberFields(form, keys) {
  return Object.fromEntries(keys.map(key => [key, form.querySelector(`[name=${key}]`).valueAsNumber]));
}

function metric(label, value, unit) {
  return `<div><dt>${label}</dt><dd>${fmt(value)} ${value === null ? '' : `<small>${unit}</small>`}</dd></div>`;
}

function zoneResult(zone, recordId, baselineOffsetMm) {
  const reasons = zone.flags.length
    ? `<ul>${zone.flags.map(flag => `<li>${esc(flag)}</li>`).join('')}</ul>`
    : `<details class="forecast-reasons"><summary>Why ${fmt(zone.netMm)} mm of net demand?</summary><ul>
        ${zone.drivers.map(driver => `<li>${esc(driver.label)} <strong>${signed.format(driver.effectMm)} mm</strong></li>`).join('')}
        <li>Fitted offset <strong>${signed.format(baselineOffsetMm)} mm</strong></li>
      </ul>${zone.netMm === 0 ? '<p class="rill-quiet">Predicted depth has a minimum of 0 mm.</p>' : ''}</details>`;
  return `<li class="forecast-result-zone">
    <div class="forecast-zone-heading">
      <h4>${zone.rank === null ? '' : `<span class="forecast-rank" aria-label="Priority ${zone.rank}">${zone.rank}</span>`}${esc(zone.name)}</h4>
      <span class="rill-chip rill-chip--${zone.flags.length || zone.shortfallM3 > 0 ? 'review' : 'sage'}">${statusLabels[zone.status]}</span>
    </div>
    <dl class="forecast-zone-metrics">
      ${metric('Demand', zone.demandM3, 'm³')}${metric('Suggested', zone.allocatedM3, 'm³')}${metric('Pump time', zone.runtimeMinutes, 'min')}
    </dl>
    ${reasons}
    ${recordId ? `<button type="button" class="rill-link forecast-link-button" data-record="${esc(recordId)}">Review zone record</button>` : ''}
  </li>`;
}

function downloadPlan({ plan, input, generatedAt }) {
  const header = ['zone', 'zone_id', 'priority', 'status', 'net_demand_mm', 'gross_demand_m3', 'suggested_m3', 'shortfall_m3', 'pump_minutes',
    'crop_stage', 'area_ha', 'soil_moisture_pct', 'refill_target_pct', 'root_depth_cm', 'reading_age_hours', 'et0_mm', 'effective_rain_mm',
    'available_water_m3', 'flow_m3_h', 'pump_window_hours', 'application_efficiency_pct', 'flags', 'model_version', 'training_source', 'generated_at_utc'];
  const byName = new Map(input.zones.map(zone => [zone.name, zone]));
  const rows = plan.zones.map(zone => {
    const source = byName.get(zone.name);
    return [zone.name, source.id, zone.rank, statusLabels[zone.status], zone.netMm?.toFixed(2), zone.demandM3, zone.allocatedM3, zone.shortfallM3,
      zone.runtimeMinutes.toFixed(2), CROP_STAGES[source.stage], ...zoneFields.map(key => source[key]),
      ...weatherFields.map(key => input[key]), ...pumpFields.map(key => input[key]), zone.flags.join(' '), plan.model.version, plan.model.trainingSource, generatedAt];
  });
  const csvCell = value => {
    let text = String(value ?? '');
    if (/^[\s]*[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  const csv = [header, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `rill-24h-plan-${generatedAt.slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

class ForecastPlanner extends HTMLElement {
  #availableZones = [];
  #latest = null;
  #sampleMode = false;
  #pending = null;

  connectedCallback() {
    if (this.querySelector('form')) return;
    this.innerHTML = `
      <div class="forecast-console">
        <form method="post" class="forecast-inputs">
          <div class="forecast-block-heading">
            <h3>Planning inputs</h3>
            <button class="rill-link forecast-link-button" type="button" data-toggle-sample>Load sample farm</button>
          </div>
          <fieldset>
            <legend>Weather for the next 24 hours</legend>
            <div class="forecast-fields">${weatherFields.map(key => field(key)).join('')}</div>
            <p class="rill-quiet">Use the rain expected to reach the root zone.</p>
          </fieldset>
          <fieldset>
            <legend>Shared water and pump limits</legend>
            <div class="forecast-fields">${pumpFields.map(key => field(key)).join('')}</div>
          </fieldset>
          <div class="forecast-zone-inputs">
            <h4>Irrigation zones</h4>
            <p class="rill-quiet">Enter volumetric soil moisture and the refill target for each zone.</p>
            <div class="forecast-zone-list" data-forecast-zones></div>
            <div class="forecast-zone-picker" data-forecast-zone-picker>
              <label>Workspace zone<select data-forecast-picker></select></label>
            </div>
            <button type="button" class="rill-button rill-button--outline rill-button--small" data-add-forecast-zone>Add zone</button>
          </div>
          <div class="forecast-controls">
            <button class="rill-button" type="submit">Run AI forecast</button>
            <p class="rill-quiet">Run the forecast to submit this plan’s readings. The operator reviews the result and runs the pump.</p>
          </div>
        </form>
        <section class="forecast-results" aria-label="24-hour irrigation plan">
          <div class="forecast-block-heading">
            <h3 tabindex="-1" data-forecast-title>24-hour irrigation plan</h3>
            <button type="button" class="rill-link forecast-link-button" data-export-forecast hidden>Export CSV</button>
          </div>
          <p class="forecast-model-name">Trained on simulated field data</p>
          <p class="forecast-status" role="status" tabindex="-1"></p>
          <div data-forecast-output><p>Enter field readings and pump limits to see the suggested watering order.</p></div>
        </section>
      </div>`;

    const form = this.querySelector('form');
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.#run(true);
    });
    form.addEventListener('invalid', event => {
      const zone = event.target.closest('details');
      if (zone) zone.open = true;
    }, true);
    form.addEventListener('input', event => {
      if (event.target.matches('[data-forecast-picker]')) return;
      if (event.target.name === 'zoneName') this.#showName(event.target);
      this.#invalidate();
    });
    this.querySelector('[data-add-forecast-zone]').addEventListener('click', () => {
      const id = this.querySelector('[data-forecast-picker]').value;
      const record = this.#availableZones.find(zone => zone.id === id);
      if (!this.#sampleMode && !record) return;
      const row = this.#addZone(record ? { id, name: this.#workspaceName(record) } : {}, true);
      row.querySelector(record ? '[name=areaHa]' : '[name=zoneName]').focus();
      this.#invalidate();
    });
    this.querySelector('[data-export-forecast]').addEventListener('click', () => {
      if (this.#latest) downloadPlan(this.#latest);
    });
    this.querySelector('[data-toggle-sample]').addEventListener('click', () => this.#toggleSample());
    this.#showZoneOptions();
  }

  #workspaceName(record) {
    const suffix = ` · ${record.id.slice(0, 8)}`;
    return record.name.slice(0, 100 - suffix.length) + suffix;
  }

  set workspaceZones(zones) {
    this.#availableZones = zones;
    if (this.#sampleMode) return;
    for (const row of this.querySelectorAll('details[data-zone-id]')) {
      const record = zones.find(zone => zone.id === row.dataset.zoneId);
      const name = row.querySelector('[name=zoneName]');
      if (!record) {
        row.remove();
        this.#invalidate();
      } else if (name.value !== this.#workspaceName(record)) {
        name.value = this.#workspaceName(record);
        this.#showName(name);
        this.#invalidate();
      }
    }
    if (this.querySelector('form')) this.#showZoneOptions();
  }

  #showZoneOptions() {
    const picker = this.querySelector('[data-forecast-picker]');
    const button = this.querySelector('[data-add-forecast-zone]');
    const chosen = [...this.querySelectorAll('details[data-zone-id]')];
    const full = chosen.length >= MAX_ZONES;
    const selected = picker.value;
    const used = new Set(chosen.map(row => row.dataset.zoneId));
    const choices = this.#availableZones.filter(zone => !used.has(zone.id));
    picker.replaceChildren(...choices.map(zone => new Option(`${zone.name} · ${zone.place}`, zone.id)));
    if (choices.some(zone => zone.id === selected)) picker.value = selected;
    if (!choices.length) picker.add(new Option(this.#availableZones.length ? 'All workspace zones added' : 'No zones in this workspace', ''));
    picker.disabled = full || !choices.length;
    button.disabled = full || (!this.#sampleMode && !choices.length);
    this.#updateSubmit();
  }

  #updateSubmit() {
    this.querySelector('[type=submit]').disabled = !!this.#pending || !this.querySelector('details[data-zone-id]');
  }

  #showName(input) {
    const name = input.value.trim() || 'New zone';
    input.closest('details').querySelector('summary').textContent = name;
    input.closest('details').querySelector('[data-remove-zone]').setAttribute('aria-label', `Remove ${name} from forecast`);
  }

  #addZone(zone, open) {
    const row = document.createElement('details');
    row.dataset.zoneId = zone.id || '';
    row.open = open;
    row.innerHTML = `<summary></summary><div class="forecast-zone-fields">
      <label>Zone name<input name="zoneName" type="text" maxlength="100" required ${zone.id ? 'readonly' : ''}></label>
      <label>Crop stage<select name="stage" required><option value="">Choose stage</option>
        ${Object.entries(CROP_STAGES).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}
      </select></label>
      ${zoneFields.map(key => field(key, zone)).join('')}
      <button class="rill-link forecast-link-button" type="button" data-remove-zone>Remove zone</button>
    </div>`;
    const name = row.querySelector('[name=zoneName]');
    name.value = zone.name || '';
    row.querySelector('[name=stage]').value = zone.stage || '';
    this.#showName(name);
    row.querySelector('[data-remove-zone]').addEventListener('click', () => {
      row.remove();
      this.#showZoneOptions();
      const add = this.querySelector('[data-add-forecast-zone]');
      (add.disabled ? this.querySelector('[name=et0Mm]') : add).focus();
      this.#invalidate();
    });
    this.querySelector('[data-forecast-zones]').append(row);
    this.#showZoneOptions();
    return row;
  }

  #toggleSample() {
    this.#sampleMode = !this.#sampleMode;
    this.querySelector('form').reset();
    this.querySelector('[data-forecast-zones]').replaceChildren();
    this.querySelector('[data-forecast-zone-picker]').hidden = this.#sampleMode;
    this.querySelector('[data-toggle-sample]').textContent = this.#sampleMode ? 'Use workspace zones' : 'Load sample farm';
    if (this.#sampleMode) {
      for (const key of [...weatherFields, ...pumpFields]) this.querySelector(`[name=${key}]`).value = example[key];
      example.zones.forEach(zone => this.#addZone(zone, false));
    }
    this.#showZoneOptions();
    this.#invalidate();
  }

  #invalidate() {
    const status = this.querySelector('.forecast-status');
    if (this.#pending || this.#latest) {
      this.#pending?.abort();
      this.#pending = null;
      this.#latest = null;
      this.querySelector('[data-export-forecast]').hidden = true;
      this.querySelector('[data-forecast-output]').hidden = true;
      status.textContent = 'Inputs changed. Run the forecast to update the plan.';
      this.#updateSubmit();
    } else if (!this.querySelector('[data-forecast-output]').hidden) {
      status.textContent = '';
    }
  }

  async #run(focus = false) {
    if (!this.requestForecast || this.#pending) return;
    const input = numberFields(this, [...weatherFields, ...pumpFields]);
    input.zones = [...this.querySelectorAll('details[data-zone-id]')].map(row => ({
      id: row.dataset.zoneId,
      name: row.querySelector('[name=zoneName]').value.trim(),
      stage: row.querySelector('[name=stage]').value,
      ...numberFields(row, zoneFields),
    }));
    const status = this.querySelector('.forecast-status');
    const output = this.querySelector('[data-forecast-output]');
    const controller = new AbortController();
    this.#pending = controller;
    this.#latest = null;
    this.#updateSubmit();
    output.hidden = true;
    this.querySelector('[data-export-forecast]').hidden = true;
    status.textContent = 'Running forecast…';
    try {
      const plan = await this.requestForecast(input, controller.signal);
      if (this.#pending !== controller) return;
      const limit = plan.limitingResource === 'pump' ? 'Pump window' : 'Available water';
      const eligible = plan.withheldZones < plan.zones.length;
      const zoneIds = new Map(input.zones.map(zone => [zone.name, zone.id]));
      output.innerHTML = `
        <dl class="forecast-totals">${metric('Forecast demand', eligible ? plan.demandM3 : null, 'm³')}${metric('Suggested', plan.allocatedM3, 'm³')}${metric('Shortfall', eligible ? plan.shortfallM3 : null, 'm³')}</dl>
        <div class="forecast-capacity">
          <div><span>${limit} caps delivery at <strong>${fmt(plan.capacityM3)} m³</strong></span><strong>${fmt(plan.runtimeMinutes / 60)} h pump time</strong></div>
          ${plan.demandM3 > 0 ? `<meter aria-label="Forecast demand covered" min="0" max="${plan.demandM3}" value="${plan.allocatedM3}"></meter>` : ''}
        </div>
        <p class="rill-quiet">Order follows predicted depth. Demand and suggested volumes include application losses.</p>
        <ol class="forecast-result-zones" aria-label="Zones in priority order">${plan.zones.map(zone => zoneResult(zone, zoneIds.get(zone.name), plan.model.baselineOffsetMm)).join('')}</ol>`;
      this.querySelector('.forecast-model-name').textContent = `${plan.model.version} · Trained on simulated field data`;
      this.#latest = { plan, input, generatedAt: plan.generatedAt };
      output.hidden = false;
      status.textContent = plan.withheldZones ? `${plan.withheldZones} ${plan.withheldZones === 1 ? 'zone needs' : 'zones need'} input review. ${eligible ? 'Totals cover zones with a forecast.' : 'No zone forecast is available.'}` : '';
      this.querySelector('[data-export-forecast]').hidden = false;
      if (focus) this.querySelector('[data-forecast-title]').focus();
    } catch (error) {
      if (this.#pending !== controller) return;
      status.textContent = error.message;
      status.focus();
    } finally {
      if (this.#pending === controller) {
        this.#pending = null;
        this.#updateSubmit();
      }
    }
  }
}

customElements.define('rill-forecast-planner', ForecastPlanner);
