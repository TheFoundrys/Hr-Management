import { Pool } from 'pg';

const poolConfig = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'hr_management_system',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  options: "-c timezone=Asia/Kolkata"
};

// Singleton pool to prevent connection leaks during HMR
const globalForPg = global as unknown as { pool: Pool };
export const pool = globalForPg.pool || new Pool(poolConfig);

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

pool.on('error', (err) => {
  console.error('❌ Unexpected PostgreSQL error on idle client', err);
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn('⚠️ Slow query:', { duration: `${duration}ms`, text: text.substring(0, 100) });
    }
    return result;
  } catch (error) {
    console.error('❌ Query error:', { error, text: text.substring(0, 100) });
    throw error;
  }
}
