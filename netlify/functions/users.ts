import { Handler } from '@netlify/functions';
import { pool } from './db';
import bcrypt from 'bcryptjs';

export const handler: Handler = async (event, context) => {
  const { httpMethod, body, queryStringParameters } = event;

  try {
    const client = await pool.connect();

    try {
      if (httpMethod === 'GET') {
        const result = await client.query(`
          SELECT id, username, name, role, avatar, created_at 
          FROM users 
          ORDER BY created_at DESC
        `);
        return {
          statusCode: 200,
          body: JSON.stringify(result.rows),
        };
      }

      if (httpMethod === 'POST') {
        const { username, name, role, avatar, password } = JSON.parse(body || '{}');
        
        // Simple validation
        if (!username || !name || !role || !password) {
          return { statusCode: 400, body: 'Missing required fields' };
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await client.query(
          `INSERT INTO users (username, name, role, avatar, password_hash) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING *`,
          [username, name, role, avatar, passwordHash]
        );

        return {
          statusCode: 201,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (httpMethod === 'PUT') {
        const { id, name, role, avatar, password } = JSON.parse(body || '{}');
        
        if (!id) {
          return { statusCode: 400, body: 'Missing user ID' };
        }

        let passwordHash = null;
        if (password) {
          passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await client.query(
          `UPDATE users 
           SET name = COALESCE($2, name), 
               role = COALESCE($3, role), 
               avatar = COALESCE($4, avatar),
               password_hash = COALESCE($5, password_hash)
           WHERE id = $1 
           RETURNING *`,
          [id, name, role, avatar, passwordHash]
        );

        if (result.rowCount === 0) {
          return { statusCode: 404, body: 'User not found' };
        }

        return {
          statusCode: 200,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (httpMethod === 'DELETE') {
        const { id } = queryStringParameters || {};
        
        if (!id) {
          return { statusCode: 400, body: 'Missing user ID' };
        }

        // Prevent deleting the last admin or specific core users if needed
        // For now, just delete
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

        if (result.rowCount === 0) {
          return { statusCode: 404, body: 'User not found' };
        }

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'User deleted' }),
        };
      }

      return { statusCode: 405, body: 'Method Not Allowed' };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};
