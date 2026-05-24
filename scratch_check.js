const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

// Initialize anon client
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runCheck() {
  // Let's find an active user profile from profiles using admin client
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .limit(10);
  
  const patient = profiles?.find(p => p.role === 'patient');
  const admin = profiles?.find(p => p.role === 'admin' && p.email);

  console.log("Patient profile found:", patient?.email);
  console.log("Admin profile found:", admin?.email);

  if (patient) {
    console.log(`\n--- Simulating Patient Login & Query ---`);
    console.log("Since we don't have password here, we will log the RLS policy directly using auth.setSession if we have session details, or we can use admin.auth to generate a temporary link or check JWT payload.");
  }

  // Let's check if we can verify the get_user_role database function definition in PostgreSQL by querying the information_schema or running a system catalog query.
  // Wait, let's try to query the routines or pg_proc via a custom RPC if we can find one, or let's create a temporary RPC to run arbitrary SQL!
  // Wait, we can't create an RPC from Node without SQL access, but we can query standard catalog views if we are using pg connection!
  // Wait, is there a PG connection string in the environment? Let's check .env.local file. No, only Supabase URL and keys.
  
  // Let's check if the get_user_role function can be recreated using standard RLS with JWT claim metadata, which is 100% immune to recursion and function cache errors!
  // In 001_enable_rls_policies.sql, RLS was defined like this:
  // (auth.jwt()->'user_metadata'->>'role') = 'doctor'
  // (auth.jwt()->'user_metadata'->>'role') IN ('admin', 'receptionist')
  //
  // Let's check if utilizing auth.jwt() is much safer and more reliable!
  // Wait, the comment in 003_security_definer_fix.sql says:
  // "Existing users have no 'role' in auth metadata, causing JWT policies to block everyone."
  // Wait! Is that true?
  // Let's check the user metadata of existing auth users! We can list users using supabaseAdmin.auth.admin.listUsers()!
  console.log("\n--- Listing Supabase Auth Users and their metadata ---");
  const { data: { users }, error: uError } = await supabaseAdmin.auth.admin.listUsers();
  if (uError) {
    console.error("Error listing users:", uError);
  } else {
    console.log(`Found ${users.length} Auth users.`);
    users.forEach(u => {
      console.log(`- ID: ${u.id}, Email: ${u.email}, Role: ${u.user_metadata?.role}, Metadata:`, u.user_metadata);
    });
  }
}

runCheck();
