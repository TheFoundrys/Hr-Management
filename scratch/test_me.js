async function testMe() {
  const url = 'http://localhost:3000/api/auth/me';
  console.log('Testing /api/auth/me at:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', data);
  } catch (err) {
    console.error('Me request failed:', err.message);
  }
}

testMe();
