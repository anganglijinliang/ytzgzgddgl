import { pool } from './db';

export const handler = async (event, context) => {
  const { httpMethod, body } = event;

  try {
    const client = await pool.connect();

    try {
      if (httpMethod === 'GET') {
        const result = await client.query(`
          SELECT * FROM production_records ORDER BY timestamp DESC
        `);
        
        // Transform keys
        const records = result.rows.map(row => ({
          id: row.id,
          orderId: row.order_id,
          subOrderId: row.sub_order_id,
          team: row.team,
          shift: row.shift,
          quantity: row.quantity,
          workshop: row.workshop,
          warehouse: row.warehouse,
          operatorId: row.operator_id,
          timestamp: row.timestamp
        }));

        return {
          statusCode: 200,
          body: JSON.stringify(records),
        };
      } 
      
      else if (httpMethod === 'POST') {
        const data = JSON.parse(body);

        await client.query('BEGIN');

        // Insert Record
        const result = await client.query(`
          INSERT INTO production_records (
            order_id, sub_order_id, team, shift, quantity, workshop, warehouse, operator_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          data.orderId,
          data.subOrderId,
          data.team,
          data.shift,
          data.quantity,
          data.workshop,
          data.warehouse,
          data.operatorId
        ]);

        // Update SubOrder produced_quantity
        await client.query(`
          UPDATE sub_orders 
          SET produced_quantity = produced_quantity + $1,
              status = CASE 
                WHEN produced_quantity + $1 >= planned_quantity THEN 'production_completed'
                ELSE 'production_partial'
              END
          WHERE id = $2
        `, [data.quantity, data.subOrderId]);

        // Check if main Order status needs update (simplified logic: check if all items complete)
        // This is complex in SQL, usually better handled by a trigger or separate logic
        // For now, we'll leave order status update for a separate check or trigger

        await client.query('COMMIT');

        return {
          statusCode: 201,
          body: JSON.stringify({ id: result.rows[0].id, message: 'Production record created' }),
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
