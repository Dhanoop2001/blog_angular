(async () => {
  try {
    const email = `test-otp-${Date.now()}@example.com`;
    console.log('test email:', email);

    let res = await fetch('http://localhost:3001/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', email, password: 'Test123!' }),
    });
    const signupText = await res.text();
    console.log('signup status', res.status, signupText);

    res = await fetch('http://localhost:3001/api/forgot-password/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const forgotText = await res.text();
    console.log('forgot status', res.status, forgotText);
  } catch (err) {
    console.error('error', err);
  }
})();
