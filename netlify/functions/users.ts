import { Handler } from '@netlify/functions';
import { pool } from './db';

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
        const { username, name, role, avatar } = JSON.parse(body || '{}');
        
        // Simple validation
        if (!username || !name || !role) {
          return { statusCode: 400, body: 'Missing required fields' };
        }

        const result = await client.query(
          `INSERT INTO users (username, name, role, avatar) 
           VALUES ($1, $2, $3, $4) 
           RETURNING *`,
          [username, name, role, avatar]
        );

        return {
          statusCode: 201,
          body: JSON.stringify(result.rows[0]),
        };
      }

      if (httpMethod === 'PUT') {
        const { id, name, role, avatar } = JSON.parse(body || '{}');
        
        if (!id) {
          return { statusCode: 400, body: 'Missing user ID' };
        }

        const result = await client.query(
          `UPDATE users 
           SET name = COALESCE($2, name), 
               role = COALESCE($3, role), 
               avatar = COALESCE($4, avatar)
           WHERE id = $1 
           RETURNING *`,
          [id, name, role, avatar]
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
