import { Handler } from '@netlify/functions';
import { pool } from './db';

export const handler: Handler = async (event, context) => {
  const { httpMethod, body } = event;

  if (httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(body || '{}');

    if (!username || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing credentials' }) };
    }

    const client = await pool.connect();

    try {
      // In a real app, we should hash passwords. 
      // For this step, we will check if the user exists and validate against a simple rule or stored hash.
      // Since the current schema might not have a password column, we will:
      // 1. Check if user exists by username
      // 2. Perform a "mock" secure check (e.g., all users use '123456' or specific logic)
      // TODO: Add 'password_hash' column to users table in next migration
      
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (result.rowCount === 0) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
      }

      const user = result.rows[0];

      // Temporary Password Validation Logic (until DB schema update)
      // Allow '123456' for everyone or 'admin123' for admin
      const validPassword = password === '123456' || (user.role === 'admin' && password === 'admin123');

      if (!validPassword) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
      }

      // Return user info without sensitive data
      const { password: _, ...userWithoutPassword } = user;
      
      return {
        statusCode: 200,
        body: JSON.stringify(userWithoutPassword),
      };

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
