// Creates a student account on the student ID route: any email (for example Gmail) plus the student number.
// It runs on Supabase (Edge Functions) so the account is created already confirmed and no email has to arrive.
// The student then uploads a photo of their student ID, and an admin approves it in Reviews before they can book.
// Deploy: Supabase dashboard > Edge Functions > Deploy a new function > name it "student-signup" > paste this file.
// Supabase provides SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the function automatically.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

export async function handle(req: Request, env: { url: string; serviceKey: string }): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply({ error: 'Use POST.' }, 405);
  let input: { uniId?: string; name?: string; email?: string; password?: string; studentNo?: string; phone?: string };
  try { input = await req.json(); } catch { return reply({ error: 'Send your details.' }, 400); }
  const uniId = String(input.uniId ?? '');
  const name = String(input.name ?? '').trim().replace(/\s+/g, ' ');
  const email = String(input.email ?? '').trim().toLowerCase();
  const password = String(input.password ?? '');
  const studentNo = String(input.studentNo ?? '').trim().toUpperCase();
  const phone = String(input.phone ?? '').trim() || null;
  if (name.split(' ').length < 2 || name.length > 80) return reply({ error: 'Enter your first and last name.', field: 'name' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 120) return reply({ error: 'Enter a valid email address.', field: 'email' }, 400);
  if (!/^[A-Z0-9/-]{4,30}$/.test(studentNo)) return reply({ error: 'Enter your student number as it is on your student ID.', field: 'studentNo' }, 400);
  if (password.length < 8 || !/[a-z]/i.test(password) || !/\d/.test(password)) return reply({ error: 'Use 8+ characters with letters and numbers.', field: 'password' }, 400);

  const admin = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: uni } = await admin.from('universities').select('id, short').eq('id', uniId).maybeSingle();
  if (!uni) return reply({ error: 'Choose your university first.' }, 400);
  const { data: taken } = await admin.from('profiles').select('id').eq('university_id', uniId).ilike('student_no', studentNo).maybeSingle();
  if (taken) return reply({ error: 'An account already uses this student number. Log in instead, or contact support@nestly.app.', field: 'studentNo' }, 400);

  // The database trigger (migration 0010) checks all of this again and marks the account as waiting for an ID check.
  const { data: made, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { role: 'student', verify: 'id', university_id: uniId, name, phone, student_no: studentNo },
  });
  if (error || !made.user) {
    const msg = /already|registered|exists/i.test(error?.message ?? '') ? 'An account with this email already exists. Log in instead.' : 'We could not create your account. Try again.';
    return reply({ error: msg, field: /already|registered|exists/i.test(error?.message ?? '') ? 'email' : undefined }, 400);
  }
  // Tell the admins, and note it in the activity log.
  const { data: admins } = await admin.from('profiles').select('id').eq('role', 'admin');
  if (admins?.length) await admin.from('notifications').insert(admins.map(a => ({ user_id: a.id, kind: 'review', title: 'Student ID to check', text: `${name} (${uni.short}) signed up with a student ID.`, to: '/a/reviews?tab=students' })));
  await admin.from('audit').insert({ actor_id: made.user.id, actor_role: 'student', action: 'Signed up with a student ID', target: uni.short, detail: name });
  return reply({ email });
}

// @ts-ignore Deno is the runtime on Supabase.
if (typeof Deno !== 'undefined') Deno.serve(req => handle(req, { url: Deno.env.get('SUPABASE_URL')!, serviceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! }));
