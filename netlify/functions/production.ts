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
          process: row.process,
          heatNo: row.heat_no,
          timestamp: row.timestamp,
          // Quality Params
          pressure: row.pressure,
          pressureTime: row.pressure_time,
          zincWeight: row.zinc_weight,
          liningThickness: row.lining_thickness
        }));

        return {
          statusCode: 200,
          body: JSON.stringify(records),
        };
      } 
      
      else if (httpMethod === 'POST') {
        const data = JSON.parse(body);
        const process = data.process || 'packaging'; // Default to packaging (finished) if not specified

        await client.query('BEGIN');

        // Insert Record
        const result = await client.query(`
          INSERT INTO production_records (
            order_id, sub_order_id, team, shift, quantity, workshop, warehouse, operator_id, heat_no, process,
            pressure, pressure_time, zinc_weight, lining_thickness
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING id
        `, [
          data.orderId,
          data.subOrderId,
          data.team,
          data.shift,
          data.quantity,
          data.workshop,
          data.warehouse,
          data.operatorId,
          data.heatNo,
          process,
          data.pressure,
          data.pressureTime,
          data.zincWeight,
          data.liningThickness
        ]);

        // Determine which column to update in sub_orders
        let updateColumn = 'produced_quantity';
        if (process === 'pulling') updateColumn = 'pulling_quantity';
        else if (process === 'hydrostatic') updateColumn = 'hydrostatic_quantity';
        else if (process === 'lining') updateColumn = 'lining_quantity';
        else if (process === 'coating') updateColumn = 'coating_quantity';
        // 'packaging' or others -> 'produced_quantity'

        // Update SubOrder quantity
        // Note: We use dynamic column name here, which is safe because we control the variable above
        await client.query(`
          UPDATE sub_orders 
          SET ${updateColumn} = COALESCE(${updateColumn}, 0) + $1
          WHERE id = $2
        `, [data.quantity, data.subOrderId]);

        // Update status logic
        if (updateColumn === 'produced_quantity') {
           await client.query(`
            UPDATE sub_orders 
            SET status = CASE 
                  -- Completed Production
                  WHEN produced_quantity >= planned_quantity THEN 'production_completed'
                  -- Partial Production
                  ELSE 'in_production'
                END
            WHERE id = $1
          `, [data.subOrderId]);
        } else {
            // For intermediate processes (pulling, etc.), ensure it is at least 'in_production' if currently 'new'
            await client.query(`
                UPDATE sub_orders
                SET status = 'in_production'
                WHERE id = $1 AND status = 'new'
            `, [data.subOrderId]);
        }

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
