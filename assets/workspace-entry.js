(() => {
  'use strict';

  if (document.body.dataset.workspaceMode !== 'live') return;
  const backend = window.RILL_WORKSPACE;
  const root = new URL(document.body.dataset.base || './', window.location.href);
  const loginUrl = new URL('login/', root);
  const dashboardUrl = new URL('dashboard/', root);
  const inviteKey = 'rill:pending-invite';
  const $ = selector => document.querySelector(selector);
  const initials = (name, fallback) => typeof name === 'string' && name.trim()
    ? name.trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase()
    : fallback;
  const openDashboard = id => {
    const url = new URL(dashboardUrl);
    if (id) url.searchParams.set('workspace', id);
    window.location.replace(url.href);
  };
  const showError = (node, message) => { node.textContent = message; node.hidden = false; };

  function readInvite() {
    const match = window.location.hash.match(/^#invite=([a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i);
    if (match) {
      sessionStorage.setItem(inviteKey, match[1]);
      history.replaceState(null, '', window.location.pathname + window.location.search);
      return match[1];
    }
    try { return sessionStorage.getItem(inviteKey); }
    catch { return null; }
  }

  async function login() {
    $('[data-live-login]').hidden = false;
    const button = $('[data-google-login]');
    const status = $('[data-live-login-status]');
    const error = $('[data-live-login-error]');
    const clearStatus = () => { status.textContent = ''; button.disabled = false; };
    if (!backend) {
      status.textContent = '';
      showError(error, 'The workspace connection is unavailable.');
      return;
    }

    async function signIn() {
      error.hidden = true;
      button.disabled = true;
      status.textContent = 'Opening Google sign-in…';
      try { await backend.signIn(loginUrl.href); }
      catch { clearStatus(); showError(error, 'Google sign-in could not start. Try again.'); }
    }
    button.addEventListener('click', signIn);
    let token;
    try { token = readInvite(); }
    catch {
      status.textContent = '';
      showError(error, 'Allow browser session storage to open this invite.');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    try {
      const user = await backend.user();
      if (!user) {
        if (window.location.search) history.replaceState(null, '', loginUrl.pathname);
        clearStatus();
        if (params.has('error') || params.has('code')) showError(error, 'Sign-in was not completed. Try again with Google.');
        if (token) status.textContent = 'Sign in with the Google account that was invited.';
        return;
      }
      if (!token) { openDashboard(); return; }
      status.textContent = 'Opening your invited workspace…';
      try {
        const id = await backend.acceptInvite(token);
        sessionStorage.removeItem(inviteKey);
        openDashboard(id);
      } catch (issue) {
        status.textContent = '';
        showError(error, issue.code === '42501'
          ? 'This invite is unavailable for the current account. Use the Google account that was invited or request another link.'
          : 'The invite could not be opened. Reload to try again.');
        const actions = $('[data-invite-actions]');
        actions.hidden = false;
        $('[data-ignore-invite]').addEventListener('click', () => {
          sessionStorage.removeItem(inviteKey);
          openDashboard();
        });
        $('[data-switch-account]').addEventListener('click', async event => {
          event.currentTarget.disabled = true;
          try { await backend.signOut(); await signIn(); }
          catch { showError(error, 'Your current session could not be closed. Try again.'); }
          finally { $('[data-switch-account]').disabled = false; }
        });
      }
    } catch {
      clearStatus();
      showError(error, 'The workspace connection could not be verified. Try again in a moment.');
    }
  }

  function attachWorkspaceForm(selector, errorSelector) {
    const form = $(selector);
    const error = $(errorSelector);
    const id = crypto.randomUUID();
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button.disabled) return;
      const name = form.elements.name.value.trim();
      if (!name) { showError(error, 'Enter a workspace name.'); return; }
      error.hidden = true;
      button.disabled = true;
      try { openDashboard(await backend.createWorkspace(id, name)); }
      catch { showError(error, 'The workspace could not be created. Your name is ready to retry.'); }
      finally { button.disabled = false; }
    });
  }

  function configureDashboard(user, workspaces, workspace) {
    $('[data-workspace-name]').textContent = workspace.name;
    $('[data-workspace-initials]').textContent = initials(workspace.name, 'RI');
    $('[data-workspace-role]').textContent = workspace.role;
    $('[data-account-workspace]').textContent = workspace.name;
    $('[data-account-email]').textContent = user.email || 'Google account';
    $('[data-account-role]').textContent = workspace.role;

    const display = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user.email || '';
    const avatar = $('[data-account-avatar]');
    avatar.textContent = initials(display, 'GO');
    avatar.title = display;
    avatar.setAttribute('aria-label', display || 'Google account');

    const picker = $('[data-workspace-picker]');
    const list = picker.querySelector('select');
    for (const item of workspaces) list.add(new Option(item.name, item.id, false, item.id === workspace.id));
    picker.hidden = workspaces.length < 2;
    list.addEventListener('change', () => openDashboard(list.value));
    attachWorkspaceForm('#create-another-workspace', '#create-another-error');

    if (workspace.role !== 'owner') return;
    const panel = $('[data-owner-settings]');
    panel.hidden = false;
    const form = $('#create-invite');
    const output = $('#invite-link');
    const result = $('[data-invite-result]');
    const error = $('#invite-error');
    const status = $('#invite-status');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('button[type="submit"]');
      if (button.disabled) return;
      error.hidden = true;
      result.hidden = true;
      status.textContent = '';
      button.disabled = true;
      try {
        const token = await backend.createInvite(workspace.id, form.elements.email.value.trim(), form.elements.role.value);
        const url = new URL(loginUrl);
        url.hash = `invite=${token}`;
        output.value = url.href;
        result.hidden = false;
        output.focus();
        output.select();
      } catch { showError(error, 'An invite could not be created. Check the email and try again.'); }
      finally { button.disabled = false; }
    });
    $('[data-copy-invite]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(output.value); status.textContent = 'Invite link copied.'; }
      catch { output.focus(); output.select(); status.textContent = 'Copy the selected link to share it.'; }
    });
  }

  async function dashboard(start) {
    const boot = $('[data-workspace-boot]');
    const status = $('[data-workspace-boot-status]');
    const setup = $('[data-workspace-setup]');
    boot.hidden = false;
    if (!backend) { status.textContent = 'The workspace connection is unavailable.'; return; }
    try {
      const user = await backend.user();
      if (!user) { window.location.replace(loginUrl.href); return; }
      let ended = false;
      backend.onSessionEnd(() => {
        ended = true;
        $('[data-dashboard-shell]').hidden = true;
        setup.hidden = true;
        window.location.replace(loginUrl.href);
      });
      const workspaces = await backend.workspaces(user.id);
      if (ended) return;
      if (!workspaces.length) {
        boot.hidden = true;
        setup.hidden = false;
        attachWorkspaceForm('#create-workspace', '#create-workspace-error');
        $('[data-setup-signout]').addEventListener('click', async event => {
          const button = event.currentTarget;
          button.disabled = true;
          try { await backend.signOut(); window.location.replace(loginUrl.href); }
          catch { showError($('#create-workspace-error'), 'Could not sign out. Try again.'); button.disabled = false; }
        });
        return;
      }
      const requested = new URLSearchParams(window.location.search).get('workspace');
      const workspace = workspaces.find(item => item.id === requested) || workspaces[0];
      const [records, events] = await Promise.all([backend.zones(workspace.id), backend.events(workspace.id)]);
      if (ended) return;
      configureDashboard(user, workspaces, workspace);
      start({ backend, workspace, records, events });
      boot.hidden = true;
    } catch {
      status.textContent = 'Rill could not load the workspace. Reload this page to try again.';
      $('[data-workspace-retry]').hidden = false;
      $('[data-workspace-retry]').addEventListener('click', () => window.location.reload());
    }
  }

  window.RILL_WORKSPACE_ENTRY = { login, dashboard };
})();
