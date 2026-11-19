(() => {
  'use strict';

  const company = window.BRAND?.company;
  const formatCount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const formatMoney = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  const select = (selector, root = document) => root.querySelector(selector);
  const selectAll = (selector, root = document) => [...root.querySelectorAll(selector)];

  function httpsUrl(value, allowedHosts) {
    if (typeof value !== 'string') return null;
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      if (allowedHosts && !allowedHosts.includes(url.hostname)) return null;
      return url;
    } catch {
      return null;
    }
  }

  function activateBooking() {
    if (company?.bookingVerified !== true) return;
    const booking = httpsUrl(company.bookingUrl, ['calendly.com', 'www.calendly.com']);
    if (!booking || booking.pathname.split('/').filter(Boolean).length < 2) return;

    const embed = new URL(booking);
    embed.searchParams.set('embed_domain', window.location.hostname);
    embed.searchParams.set('embed_type', 'Inline');

    for (const panel of selectAll('[data-booking-panel]')) {
      const frame = document.createElement('iframe');
      frame.className = 'rill-calendly-frame';
      frame.title = 'Schedule a Rill demo with Calendly';
      frame.loading = 'lazy';
      frame.src = embed.href;
      select('[data-calendly-slot]', panel)?.replaceChildren(frame);
      select('[data-booking-external]', panel).href = booking.href;
      panel.hidden = false;
    }
  }

  function activateCompany() {
    if (!company) return;
    const { legalName, rcNumber, headquarters, registrationEvidence, registrationVerified } = company;
    if (registrationVerified === true && registrationEvidence && legalName?.trim() && rcNumber?.trim()) {
      const identity = [legalName.trim(), `RC ${rcNumber.trim()}`, headquarters?.trim()].filter(Boolean).join(' · ');
      for (const element of selectAll('[data-company-identity]')) {
        element.textContent = identity;
        element.hidden = false;
      }
    }

    const maintainer = company.team?.[0];
    const linkedin = httpsUrl(maintainer?.linkedin, ['www.linkedin.com', 'linkedin.com']);
    if (linkedin?.pathname.startsWith('/in/')) {
      for (const element of selectAll('[data-team-linkedin], [data-company-profile]')) {
        element.href = linkedin.href;
        element.hidden = false;
        if (element.matches('[data-company-profile]')) element.textContent = 'LinkedIn';
      }
    }

    const directory = select('[data-team-directory]');
    if (directory) {
      for (const member of company.team?.slice(1) ?? []) {
        if (member.verified !== true || !member.name || !member.role || !member.bio) continue;
        const card = document.createElement('article');
        card.className = 'rill-card rill-profile';
        const details = document.createElement('div');
        for (const [tag, value] of [['h3', member.name], ['p', member.role], ['p', member.bio]]) {
          const element = document.createElement(tag);
          element.textContent = value;
          details.append(element);
        }
        const url = httpsUrl(member.linkedin, ['www.linkedin.com', 'linkedin.com']);
        if (url?.pathname.startsWith('/in/')) {
          const profile = document.createElement('a');
          profile.className = 'rill-link';
          profile.href = url.href;
          profile.textContent = 'LinkedIn';
          details.append(profile);
        }
        card.append(details);
        directory.append(card);
      }
    }

    if (company.azureDeploymentVerified === true && httpsUrl(company.azureDeploymentEvidence)) {
      for (const element of selectAll('[data-cloud-credit]')) element.textContent = 'Built on Microsoft Azure';
    }
  }

  function showObservedUsage() {
    const usage = company?.usage;
    const target = select('[data-usage]');
    if (!target || usage?.verified !== true) return;

    const { periodStart, periodEnd, activeOrganizations, forecasts, sourceUrl } = usage;
    const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
    const source = httpsUrl(sourceUrl);
    if (!source || !validDate(periodStart) || !validDate(periodEnd) || periodStart > periodEnd
      || periodEnd > new Date().toISOString().slice(0, 10)
      || !Number.isSafeInteger(activeOrganizations) || activeOrganizations < 1
      || !Number.isSafeInteger(forecasts) || forecasts < 1) return;

    const heading = document.createElement('h3');
    heading.textContent = 'Reported platform usage';
    const report = document.createElement('p');
    report.className = 'rill-copy';
    report.textContent = `${formatCount.format(activeOrganizations)} active organizations · ${formatCount.format(forecasts)} zone forecasts · ${periodStart} to ${periodEnd}`;
    const link = document.createElement('a');
    link.className = 'rill-link';
    link.href = source.href;
    link.textContent = 'Usage report';
    target.replaceChildren(heading, report, link);
    target.hidden = false;
  }

  const fieldExplorer = select('[data-field-explorer]');
  if (fieldExplorer && Array.isArray(window.BRAND?.records)) {
    const records = new Map(window.BRAND.records.map(record => [record[0], record]));
    const pins = selectAll('[data-field-zone]', fieldExplorer).filter(pin => records.has(pin.dataset.fieldZone));
    const status = select('[data-field-status]', fieldExplorer);
    const tones = { 'Needs review': 'review', Scheduled: 'scheduled', Watered: 'watered' };
    const details = {
      name: select('[data-field-name]', fieldExplorer),
      place: select('[data-field-place]', fieldExplorer),
      volume: select('[data-field-volume]', fieldExplorer),
      note: select('[data-field-note]', fieldExplorer)
    };

    function selectZone(pin) {
      const [, name, place, volume, , state, , note] = records.get(pin.dataset.fieldZone);
      details.name.textContent = name;
      details.place.textContent = place;
      details.volume.textContent = formatCount.format(volume);
      details.note.textContent = note;
      status.textContent = state;
      status.dataset.fieldTone = tones[state];
      for (const item of pins) item.setAttribute('aria-pressed', String(item === pin));
    }

    if (pins.length) {
      selectZone(pins[0]);
      for (const pin of pins) {
        pin.hidden = false;
        pin.addEventListener('click', () => selectZone(pin));
      }
      select('[data-field-instruction]', fieldExplorer).hidden = false;
    }
  }

  for (const group of selectAll('[data-rill-billing]')) {
    const options = selectAll('button', group);
    const prices = selectAll('[data-rill-price]', group.closest('.rill-section'));
    for (const option of options) {
      option.addEventListener('click', () => {
        const annual = option.value === 'annual';
        for (const other of options) other.setAttribute('aria-pressed', String(other === option));
        for (const price of prices) {
          const rate = Number(price.dataset.rillPrice) * (annual ? .8 : 1);
          const detail = select('[data-rill-billing-detail]', price.closest('.rill-price'));
          price.textContent = formatMoney.format(rate).replace(/\.00$/, '');
          detail.textContent = annual ? `${formatMoney.format(rate * 12)} billed annually` : '';
          detail.hidden = !annual;
        }
      });
    }
  }

  for (const planner of selectAll('[data-capacity-planner]')) {
    const inputs = selectAll('input', planner);
    const outputs = selectAll('output', planner);
    const notice = select('[role="status"]', planner);
    planner.addEventListener('submit', event => event.preventDefault());
    planner.addEventListener('input', () => {
      if (inputs.some(input => !input.validity.valid)) {
        outputs.forEach(output => { output.value = '—'; });
        notice.textContent = 'Enter whole numbers within the specified ranges.';
        return;
      }
      const [farms, zones, updates, days] = inputs.map(input => input.valueAsNumber);
      const daily = farms * zones * updates;
      [daily * days, daily, daily / 24].forEach((count, index) => {
        outputs[index].value = formatCount.format(count);
      });
      notice.textContent = '';
    });
  }

  const enquiry = select('[data-enquiry-form]');
  if (enquiry) {
    const plan = new URLSearchParams(window.location.search).get('plan');
    if (['starter', 'growth', 'enterprise'].includes(plan)) {
      const label = plan[0].toUpperCase() + plan.slice(1);
      select('[data-plan-context]', enquiry).textContent = `${label} plan enquiry`;
      enquiry.elements.workflow.value = 'Pricing and processing allowance';
      enquiry.dataset.selectedPlan = label;
    }
    if (company?.contactVerified === true && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(company.contactEmail)) {
      enquiry.dataset.enquiryMethod = 'email';
      enquiry.elements.consent.required = false;
      select('[data-public-consent]', enquiry).hidden = true;
      select('[data-enquiry-destination]', enquiry).textContent = 'Review the request, then send it through your email app.';
      select('[data-enquiry-send]', enquiry).textContent = 'Open email draft';
    }
  }

  activateBooking();
  activateCompany();
  showObservedUsage();
})();
