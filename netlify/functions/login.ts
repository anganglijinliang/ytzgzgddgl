import { Handler } from '@netlify/functions';
import { pool } from './db';
import bcrypt from 'bcryptjs';

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
      const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);
      
      if (result.rowCount === 0) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
      }

      const user = result.rows[0];
      let validPassword = false;

      if (user.password_hash) {
          validPassword = await bcrypt.compare(password, user.password_hash);
      } else {
          // Fallback for users without hash (legacy/demo)
          // Allow '123456' for everyone or 'admin123' for admin
          validPassword = password === '123456' || (user.role === 'admin' && password === 'admin123');
      }

      if (!validPassword) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
      }

      // Return user info without sensitive data
      const { password: _, password_hash: __, ...userWithoutPassword } = user;
      
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
