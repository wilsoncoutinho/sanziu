// Simple integration test: signup -> login -> GET /api/accounts
// Requires dev server running at http://localhost:3000 and DB available.

async function run() {
  const base = 'http://localhost:3000';
  const rnd = Math.floor(Math.random() * 100000);
  const email = `test${rnd}@example.com`;
  const password = 'secret123';

  console.log('signup ->', email);
  const signupRes = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Tester', email, password }),
  });
  const signupJson = await signupRes.json();
  console.log('signup status', signupRes.status, signupJson);
  if (signupRes.status !== 201) {
    console.error('Signup failed; aborting');
    process.exit(2);
  }

  const token = signupJson.token;
  if (!token) {
    console.error('No token returned from signup');
    process.exit(3);
  }

  console.log('login ->', email);
  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json();
  console.log('login status', loginRes.status, loginJson);
  if (loginRes.status !== 200) {
    console.error('Login failed; aborting');
    process.exit(4);
  }

  const useToken = loginJson.token || token;
  console.log('using token length', useToken?.length || 0);

  console.log('GET /api/accounts with Bearer');
  const accountsRes = await fetch(`${base}/api/accounts`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${useToken}` },
  });
  const accountsJson = await accountsRes.json();
  console.log('accounts status', accountsRes.status, accountsJson);

  if (accountsRes.status === 200) {
    console.log('Integration test succeeded');
    process.exit(0);
  } else {
    console.error('Integration test failed');
    process.exit(5);
  }
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
