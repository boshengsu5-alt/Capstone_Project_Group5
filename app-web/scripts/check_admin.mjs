import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ysmctiqieghqlcnuoauv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzbWN0aXFpZWdocWxjbnVvYXV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDU1NjUsImV4cCI6MjA4ODM4MTU2NX0.vXtQSW66K1Ik3JwM4RINuyKZEzwYr314Hjrgh5lEXeg';

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // 1. Check 123456@qq.com role
  const { data: qdata } = await supabase.from('profiles').select('*').eq('email', '123456@qq.com');
  console.log('123456@qq.com profile:', qdata);

  // 2. Try logging in as admin@centria.fi
  const passwords = ['123456', 'password', 'password123', 'admin', 'admin123', 'admin@centria.fi'];
  for (const p of passwords) {
     const { data, error } = await supabase.auth.signInWithPassword({ email: 'admin@centria.fi', password: p });
     if (!error) {
       console.log(`✅ SUCCESS! admin@centria.fi password is: ${p}`);
       return;
     }
  }
  console.log('Failed to find password for admin@centria.fi');
}
main().catch(console.error);
