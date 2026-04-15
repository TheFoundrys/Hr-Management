const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env
dotenv.config();

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'hr_management_system',
});

async function runSql() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Please provide a SQL file path.');
    process.exit(1);
  }

  const sql = fs.readFileSync(path.resolve(sqlFile), 'utf8');

  try {
    console.log(`🚀 Executing SQL from ${sqlFile}...`);
    const result = await pool.query(sql);
    console.log('✅ SQL executed successfully!');
    if (result.rows && result.rows.length > 0) {
      console.table(result.rows);
    } else {
      console.log('No rows returned.');
    }
  } catch (err) {
    console.error('❌ Error executing SQL:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSql();
