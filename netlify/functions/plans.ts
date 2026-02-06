import { pool } from './db';

export const handler = async (event, context) => {
  const { httpMethod, body } = event;

  try {
    const client = await pool.connect();

    try {
      if (httpMethod === 'GET') {
        const result = await client.query(`
          SELECT * FROM production_plans 
          WHERE status = 'pending' 
          ORDER BY created_at DESC
        `);
        
        const plans = result.rows.map(row => ({
          id: row.id,
          orderId: row.order_id,
          subOrderId: row.sub_order_id,
          workshop: row.workshop,
          team: row.team,
          shift: row.shift,
          plannedDate: row.planned_date,
          quantity: row.quantity,
          process: row.process,
          status: row.status
        }));

        return {
          statusCode: 200,
          body: JSON.stringify(plans),
        };
      } 
      
      else if (httpMethod === 'POST') {
        const data = JSON.parse(body);

        await client.query('BEGIN');

        const result = await client.query(`
          INSERT INTO production_plans (
            order_id, sub_order_id, workshop, team, shift, planned_date, quantity, process, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
          RETURNING id
        `, [
          data.orderId,
          data.subOrderId,
          data.workshop,
          data.team,
          data.shift,
          data.plannedDate || data.date, // handle both keys just in case
          data.quantity,
          data.process
        ]);

        await client.query('COMMIT');

        return {
          statusCode: 201,
          body: JSON.stringify({ id: result.rows[0].id, message: 'Plan created' }),
        };
      }

      else if (httpMethod === 'PUT') {
        const data = JSON.parse(body);
        const { id, ...updates } = data;

        // Simple update (mostly for status change to 'completed')
        // Construct dynamic update query
        const keys = Object.keys(updates);
        if (keys.length === 0) return { statusCode: 400, body: 'No updates provided' };

        const setClause = keys.map((key, index) => {
             // Simple mapping: status -> status, quantity -> quantity
             // Add more mappings if needed
             return `${key} = $${index + 2}`;
        }).join(', ');

        const values = [id, ...Object.values(updates)];

        await client.query(`
            UPDATE production_plans
            SET ${setClause}
            WHERE id = $1
        `, values);

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Plan updated' }),
        };
      }
      
      return { statusCode: 405, body: 'Method Not Allowed' };

    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};
