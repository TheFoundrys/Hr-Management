const { Client } = require('pg');
require('dotenv').config();

async function checkUsersSchema() {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DATABASE,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
    console.log('Users table columns:');
    console.table(res.rows);
    
    const res2 = await client.query(`
      SELECT conname, pg_get_constraintdef(c.oid) 
      FROM pg_constraint c 
      JOIN pg_class t ON t.oid = c.conrelid 
      WHERE t.relname = 'users'
    `);
    console.log('Users table constraints:');
    console.table(res2.rows);
  } catch (e) {
    console.error('Failed to check schema:', e);
  } finally {
    await client.end();
  }
}

checkUsersSchema();
