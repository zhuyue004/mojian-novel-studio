import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.95.3/+esm';

const client = createClient(
  'https://vyabmqgisuoiqvyzbpwf.supabase.co',
  'sb_publishable_mQFR2_NI6wrON63ccrysEQ_lYSUqWy7'
);

window.mojianCloud = {
  async getUser() {
    const { data: { user } } = await client.auth.getUser();
    return user;
  },
  async signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },
  async signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password });
    if (error) throw error;
    return data.user;
  },
  async signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },
  async loadState() {
    const user = await this.getUser();
    if (!user) return null;
    const { data, error } = await client.from('novel_app_state').select('data, updated_at').eq('user_id', user.id).maybeSingle();
    if (error) throw error;
    return data ? { state: data.data, updatedAt: data.updated_at } : null;
  },
  async saveState(state) {
    const user = await this.getUser();
    if (!user) return;
    const { data, error } = await client.from('novel_app_state').upsert({ user_id: user.id, data: state, updated_at: new Date().toISOString() }).select('updated_at').single();
    if (error) throw error;
    return data?.updated_at || null;
  },
  onAuthChange(callback) {
    return client.auth.onAuthStateChange((_event, session) => callback(session?.user || null));
  }
};

window.dispatchEvent(new Event('mojian-cloud-ready'));
