(() => {
  'use strict';

  if (document.body.dataset.workspaceMode !== 'live') return;
  const config = window.RILL_BACKEND;
  if (!config || typeof window.supabase?.createClient !== 'function') return;

  const client = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: false, persistSession: true, autoRefreshToken: true }
  });
  const zoneColumns = 'id,name,place,value,score,status,owner,note,revision';
  const normalize = zone => ({ ...zone, value: Number(zone.value) });
  const zoneTable = () => client.from('rill_zones');
  function result({ data, error }) {
    if (error) throw error;
    return data;
  }

  window.RILL_WORKSPACE = {
    async user() {
      const response = await client.auth.getUser();
      if (response.error?.name === 'AuthSessionMissingError' || response.error?.status === 401 || response.error?.status === 403) return null;
      return result(response).user;
    },
    async signIn(email, password) {
      result(await client.auth.signInWithPassword({ email, password }));
    },
    async signUp(email, password, emailRedirectTo) {
      return result(await client.auth.signUp({ email, password, options: { emailRedirectTo } }));
    },
    async requestPasswordReset(email, redirectTo) {
      result(await client.auth.resetPasswordForEmail(email, { redirectTo }));
    },
    async exchangeEmailCode(code) {
      return result(await client.auth.exchangeCodeForSession(code));
    },
    async updatePassword(password) {
      result(await client.auth.updateUser({ password }));
    },
    async signOut() {
      result(await client.auth.signOut({ scope: 'local' }));
    },
    onSessionEnd(callback) {
      client.auth.onAuthStateChange(event => {
        if (event === 'SIGNED_OUT') queueMicrotask(callback);
      });
    },
    async workspaces(userId) {
      const memberships = result(await client.from('rill_memberships')
        .select('role,rill_workspaces(id,name,plan)').eq('user_id', userId));
      return memberships.filter(row => row.rill_workspaces)
        .map(row => ({ ...row.rill_workspaces, role: row.role }))
        .sort((left, right) => left.name.localeCompare(right.name));
    },
    async createWorkspace(id, name) {
      return result(await client.rpc('rill_create_workspace', { p_id: id, p_name: name }));
    },
    async createInvite(workspaceId, email, role) {
      return result(await client.rpc('rill_create_invite', { p_workspace_id: workspaceId, p_email: email, p_role: role }));
    },
    async acceptInvite(token) {
      return result(await client.rpc('rill_accept_invite', { p_token: token }));
    },
    async zones(workspaceId) {
      const pageSize = 500;
      const zones = [];
      let cursor;
      for (;;) {
        let query = zoneTable().select(zoneColumns).eq('workspace_id', workspaceId).order('id').limit(pageSize);
        if (cursor) query = query.gt('id', cursor);
        const page = result(await query);
        zones.push(...page.map(normalize));
        if (page.length < pageSize) return zones;
        cursor = page.at(-1).id;
      }
    },
    async events(workspaceId) {
      const rows = result(await client.from('rill_events').select('zone_id,zone_name,action,status,occurred_at')
        .eq('workspace_id', workspaceId).order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(30));
      return rows.map(row => ({
        at: row.occurred_at,
        action: row.action === 'Status changed' ? `Status changed to ${row.status.toLowerCase()}` : row.action,
        record: row.zone_name,
        reference: row.zone_id.slice(0, 8)
      }));
    },
    async createZone(workspaceId, zone) {
      const response = await zoneTable().insert({ ...zone, workspace_id: workspaceId }).select(zoneColumns).single();
      if (response.error?.code !== '23505') return normalize(result(response));
      const existing = result(await zoneTable().select(zoneColumns).eq('workspace_id', workspaceId).eq('id', zone.id).maybeSingle());
      if (!existing) throw response.error;
      return normalize(existing);
    },
    async updateZone(workspaceId, zone, changes) {
      const updated = result(await zoneTable().update(changes).eq('workspace_id', workspaceId)
        .eq('id', zone.id).eq('revision', zone.revision).select(zoneColumns).maybeSingle());
      return updated ? normalize(updated) : null;
    }
  };
})();
