// fetch is global in Node.js 18+

async function testLogin() {
  const url = 'http://localhost:3000/api/auth/login';
  const body = {
    email: 'admin@thefoundrys.com', // Assuming this exists from previous logs
    password: 'password' // Generic password guess
  };

  console.log('Testing login at:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', data);
  } catch (err) {
    console.error('Login request failed:', err.message);
  }
}

testLogin();
