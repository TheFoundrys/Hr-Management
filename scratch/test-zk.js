const ZKLib = require('node-zklib');
const dotenv = require('dotenv');
dotenv.config();

async function testZKTeco() {
  const ip = process.env.ZKTECO_DEVICE_IP;
  const port = 4370;
  console.log(`🔌 Testing ZKTeco connection to ${ip}:${port}...`);
  
  const zkInstance = new ZKLib(ip, port, 10000, 4000);
  try {
    await zkInstance.createSocket();
    console.log('✅ Connected to ZKTeco device!');
    const info = await zkInstance.getInfo();
    console.log('Device Info:', info);
    await zkInstance.disconnect();
  } catch (err) {
    console.error('❌ Failed to connect to ZKTeco device:', err.message || err);
  }
}

testZKTeco();
