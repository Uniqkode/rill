const map = document.querySelector('[data-field-explorer] .field-map');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

async function mountFieldMotion(fieldMap) {
  if (motion.matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'field-map-motion';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
  if (!context) return;

  const {
    AmbientLight, DirectionalLight, Group, Mesh, MeshBasicMaterial, MeshPhongMaterial,
    OrthographicCamera, RingGeometry, Scene, SphereGeometry, WebGLRenderer,
  } = await import('./three-field.min.js');
  if (motion.matches || !fieldMap.isConnected) return;

  const renderer = new WebGLRenderer({ canvas, context });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0, 0);
  fieldMap.append(canvas);
  fieldMap.classList.add('has-field-motion');

  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 240);
  camera.position.z = 100;
  const scene = new Scene();
  const zone = new Group();
  const keyLight = new DirectionalLight(0xffffff, 2);
  keyLight.position.set(-35, 50, 80);
  scene.add(zone, keyLight, new AmbientLight(0xcae8ff, 1.2));

  const ringGeometry = new RingGeometry(0.968, 1, 64);
  const rings = Array.from({ length: 3 }, () => {
    const ring = new Mesh(ringGeometry, new MeshBasicMaterial({ transparent: true, depthWrite: false }));
    zone.add(ring);
    return ring;
  });
  const dropletGeometry = new SphereGeometry(2.2, 8, 6);
  const dropletMaterial = new MeshPhongMaterial({
    color: 0x9fe9e0, emissive: 0x226054, shininess: 70, transparent: true, depthWrite: false,
  });
  const droplets = Array.from({ length: 12 }, () => {
    const drop = new Mesh(dropletGeometry, dropletMaterial);
    zone.add(drop);
    return drop;
  });

  const duration = 2600;
  let frame = 0;
  let startedAt = 0;
  let activePin = null;
  let radius = 0;
  let contextLost = false;

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    activePin = null;
    canvas.hidden = true;
  }

  function positionScene() {
    const bounds = fieldMap.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !activePin) return false;
    const pin = activePin.getBoundingClientRect();
    camera.left = -bounds.width / 2;
    camera.right = bounds.width / 2;
    camera.top = bounds.height / 2;
    camera.bottom = -bounds.height / 2;
    camera.updateProjectionMatrix();
    renderer.setSize(bounds.width, bounds.height, false);
    zone.position.set(
      pin.left + pin.width / 2 - bounds.left - bounds.width / 2,
      bounds.top + bounds.height / 2 - pin.top - pin.height / 2,
      0,
    );
    radius = Math.min(bounds.width * 0.17, bounds.height * 0.25, 78);
    return true;
  }

  function draw(now) {
    const elapsed = now - startedAt;
    if (elapsed >= duration || motion.matches || document.hidden || contextLost) {
      stop();
      return;
    }

    const progress = elapsed / duration;
    rings.forEach((ring, index) => {
      const age = (progress - 0.13 * index) / 0.72;
      ring.visible = age >= 0 && age < 1;
      if (!ring.visible) return;
      const spread = 20 + (radius - 20) * (1 - (1 - age) ** 2);
      ring.scale.set(spread, spread * 0.8, 1);
      ring.material.opacity = 0.76 * (1 - age);
    });
    dropletMaterial.opacity = Math.sin(Math.PI * progress) * 0.92;
    droplets.forEach((drop, index) => {
      const travel = (progress * 2.25 + index / droplets.length) % 1;
      const angle = index * 2.4 + progress * Math.PI;
      const distance = 18 + travel * (radius - 18);
      const height = 42 * travel * (1 - travel);
      drop.position.set(Math.cos(angle) * distance, Math.sin(angle) * distance * 0.8 + height, height);
      drop.scale.setScalar(1 - travel * 0.52);
    });
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  }

  function play(pin) {
    if (!pin || motion.matches || document.hidden || contextLost) return;
    stop();
    activePin = pin;
    if (!positionScene()) return;
    const color = getComputedStyle(pin).getPropertyValue('--field-tone').trim() || '#d2f77c';
    for (const ring of rings) ring.material.color.set(color);
    canvas.hidden = false;
    startedAt = performance.now();
    frame = requestAnimationFrame(draw);
  }

  fieldMap.addEventListener('click', event => play(event.target.closest('[data-field-zone]:not([hidden])')));
  new ResizeObserver(() => {
    if (frame && !positionScene()) stop();
  }).observe(fieldMap);
  canvas.addEventListener('webglcontextlost', () => {
    contextLost = true;
    stop();
    fieldMap.classList.remove('has-field-motion');
  });
  motion.addEventListener('change', ({ matches }) => { if (matches) stop(); });
  play(fieldMap.querySelector('[data-field-zone][aria-pressed="true"]:not([hidden])'));
}

if (map && !motion.matches && 'IntersectionObserver' in window && 'ResizeObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    mountFieldMotion(map).catch(() => { /* The optional effect can be skipped when rendering is unavailable. */ });
  });
  observer.observe(map);
}
