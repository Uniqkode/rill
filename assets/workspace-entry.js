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
    const status = $('[data-live-login-status]');
    const error = $('[data-live-login-error]');
    if (!backend) {
      status.textContent = '';
      showError(error, 'The workspace connection is unavailable.');
      return;
    }

    const form = $('#account-form');
    const fields = form.querySelector('fieldset');
    const email = form.elements.email;
    const password = form.elements.password;
    const submit = form.querySelector('button[type="submit"]');
    const title = $('#login-title');
    const passwordToggle = $('[data-account-password-toggle]');
    const passwordLabel = $('[data-account-password-label]');
    const modeButtons = form.querySelectorAll('[data-account-mode]');
    const inviteActions = $('[data-invite-actions]');
    const modes = {
      signin: { title: 'Log in to Rill', submit: 'Log in', pending: 'Signing in…' },
      signup: { title: 'Create your account', submit: 'Create account', pending: 'Creating account…' },
      reset: { title: 'Reset your password', submit: 'Send reset link', pending: 'Sending reset link…' },
      update: { title: 'Choose a new password', submit: 'Save password', pending: 'Saving password…' }
    };
    const authErrors = new Map([
      ['invalid_credentials', 'Check your email address and password.'],
      ['email_not_confirmed', 'Confirm your email address before signing in.'],
      ['email_address_not_authorized', 'Email delivery is unavailable for this address. Ask your workspace owner for help.'],
      ['signup_disabled', 'Ask your workspace owner to create your account.'],
      ['weak_password', 'Choose a stronger password and try again.'],
      ['same_password', 'Choose a password you have not used for this account.'],
      ['over_email_send_rate_limit', 'Wait a minute before requesting another email.'],
      ['over_request_rate_limit', 'Too many attempts. Wait a minute and try again.']
    ]);
    let token;
    try { token = readInvite(); }
    catch {
      status.textContent = '';
      showError(error, 'Allow browser session storage to open this invite.');
      return;
    }
    let mode;
    const invitePrompt = () => token ? 'Use the email address that received the workspace invite.' : '';

    function showPassword(visible) {
      password.type = visible ? 'text' : 'password';
      passwordToggle.textContent = visible ? 'Hide' : 'Show';
      passwordToggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
      passwordToggle.setAttribute('aria-pressed', String(visible));
    }

    function showMode(next, message = '') {
      mode = next;
      title.textContent = modes[mode].title;
      submit.textContent = modes[mode].submit;
      status.textContent = message;
      error.hidden = true;
      form.hidden = false;
      const needsEmail = mode !== 'update';
      const needsPassword = mode !== 'reset';
      const newPassword = mode === 'signup' || mode === 'update';
      $('[data-account-email-label]').hidden = email.hidden = email.disabled = !needsEmail;
      $('[data-account-password-field]').hidden = passwordLabel.hidden = password.disabled = !needsPassword;
      passwordLabel.textContent = newPassword ? 'New password' : 'Password';
      password.autocomplete = newPassword ? 'new-password' : 'current-password';
      password.value = '';
      showPassword(false);
      const signingIn = mode === 'signin';
      for (const button of modeButtons) {
        const backToLogin = button.dataset.accountMode === 'signin';
        button.hidden = mode === 'update' || (backToLogin ? signingIn : !signingIn);
      }
    }

    async function openWorkspace() {
      form.hidden = true;
      error.hidden = true;
      if (!token) { openDashboard(); return; }
      status.textContent = 'Opening your invited workspace…';
      try {
        const id = await backend.acceptInvite(token);
        sessionStorage.removeItem(inviteKey);
        openDashboard(id);
      } catch (issue) {
        status.textContent = '';
        showError(error, issue.code === '42501'
          ? 'Use the email address that received the invite or request another link.'
          : 'The invite could not be opened. Reload to try again.');
        inviteActions.hidden = false;
      }
    }

    $('[data-ignore-invite]').addEventListener('click', () => {
      sessionStorage.removeItem(inviteKey);
      openDashboard();
    });
    $('[data-switch-account]').addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await backend.signOut();
        inviteActions.hidden = true;
        email.value = '';
        showMode('signin', invitePrompt());
        email.focus();
      } catch {
        showError(error, 'Could not sign out. Try again.');
      } finally {
        button.disabled = false;
      }
    });
    passwordToggle.addEventListener('click', () => showPassword(password.type === 'password'));
    for (const button of modeButtons) {
      button.addEventListener('click', () => {
        const next = button.dataset.accountMode;
        showMode(next, next === 'signup' || next === 'signin' ? invitePrompt() : '');
        email.focus();
      });
    }
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (fields.disabled) return;
      const address = email.value.trim();
      const value = password.value;
      error.hidden = true;
      if ((mode === 'signup' || mode === 'update') && (value.length < 8 || new TextEncoder().encode(value).length > 72)) {
        showError(error, 'Use at least 8 characters and keep the password within 72 bytes.');
        return;
      }
      fields.disabled = true;
      status.textContent = modes[mode].pending;
      try {
        if (mode === 'signup') {
          const { session } = await backend.signUp(address, value, loginUrl.href);
          if (session) {
            await backend.signOut();
            showMode('signin');
            showError(error, 'Email confirmation is unavailable. Ask your workspace owner for help.');
            return;
          }
          showMode('signin', 'Check your email for a confirmation link. Open it in this browser.');
        } else if (mode === 'reset') {
          await backend.requestPasswordReset(address, loginUrl.href);
          showMode('signin', 'If this email has a Rill account, you’ll receive a reset link. Open it in this browser.');
        } else {
          if (mode === 'update') await backend.updatePassword(value);
          else await backend.signIn(address, value);
          password.value = '';
          await openWorkspace();
        }
      } catch (issue) {
        status.textContent = '';
        showError(error, authErrors.get(issue?.code) || 'Rill could not complete this request. Try again in a moment.');
      } finally {
        fields.disabled = false;
      }
    });

    const params = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const code = params.get('code');
    try {
      if (code || params.has('error') || fragment.has('error')) {
        try {
          if (!code) throw new Error('Invalid email link');
          const { redirectType } = await backend.exchangeEmailCode(code);
          if (redirectType === 'recovery') showMode('update');
          else await openWorkspace();
        } catch {
          showMode('signin', invitePrompt());
          showError(error, 'This email link could not open a session. Log in or request a new link in this browser.');
        } finally {
          history.replaceState(null, '', loginUrl.pathname);
        }
      } else if (await backend.user()) {
        await openWorkspace();
      } else {
        showMode('signin', invitePrompt());
      }
    } catch {
      showMode('signin', invitePrompt());
      showError(error, 'The workspace connection could not be verified. Try again in a moment.');
    } finally {
      fields.disabled = false;
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
    $('[data-account-email]').textContent = user.email || 'Rill account';
    $('[data-account-role]').textContent = workspace.role;

    const display = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user.email || '';
    const avatar = $('[data-account-avatar]');
    avatar.textContent = initials(display, 'RI');
    avatar.title = display;
    avatar.setAttribute('aria-label', display || 'Rill account');

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
      start({ backend, workspace, records, events, userId: user.id });
      boot.hidden = true;
    } catch {
      status.textContent = 'Rill could not load the workspace. Reload this page to try again.';
      $('[data-workspace-retry]').hidden = false;
      $('[data-workspace-retry]').addEventListener('click', () => window.location.reload());
    }
  }

  window.RILL_WORKSPACE_ENTRY = { login, dashboard };
})();
