import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

const envPath = resolve(process.cwd(), '.env.local');
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  const key = t.slice(0, i).trim();
  let val = t.slice(i + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  if (!process.env[key]) process.env[key] = val;
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

async function main() {
  const { data: contests } = await admin
    .from('contests')
    .select('id, title, status, assets')
    .neq('status', 'closed')
    .order('id', { ascending: false });

  console.log('\nOpen contests:');
  for (const c of contests || []) {
    const { count } = await admin
      .from('participations')
      .select('*', { count: 'exact', head: true })
      .eq('contest_id', c.id);
    console.log(`  #${c.id} ${c.title} — ${count ?? 0} traders`);
  }

  const { data: parts, error: partsErr } = await admin
    .from('participations')
    .select('user_id, contest_id, cash, positions')
    .eq('contest_id', 19);

  console.log(`\nContest #19 participations (${parts?.length ?? 0})`, partsErr?.message || '');
  const { data: profiles } = await admin.from('profiles').select('id, username');
  const profileMap = new Map((profiles || []).map((p) => [p.id, p.username]));
  for (const p of parts || []) {
    const pos = Array.isArray(p.positions) ? p.positions : [];
    console.log(`  @${profileMap.get(p.user_id) ?? '?'} — cash $${p.cash} — ${pos.length} positions`);
  }

  const { data: bots } = await admin.from('profiles').select('id, username');
  const botNames = ['jeff', 'guru', 'cip', 'nova', 'tape', 'wolf', 'apex', 'rekt', 'moon', 'bell'];
  console.log('\nBot profiles:');
  for (const name of botNames) {
    const hit = (bots || []).find((b) => b.username === name);
    console.log(`  ${name}: ${hit ? hit.id : 'MISSING'}`);
  }
}
main();