import { pool } from './db';

export const handler = async (event, context) => {
  const { httpMethod, body } = event;

  try {
    const client = await pool.connect();

    try {
      if (httpMethod === 'GET') {
        const result = await client.query(`
          SELECT * FROM shipping_records ORDER BY timestamp DESC
        `);
        
        const records = result.rows.map(row => ({
          id: row.id,
          orderId: row.order_id,
          subOrderId: row.sub_order_id,
          quantity: row.quantity,
          transportType: row.transport_type,
          shippingType: row.shipping_type,
          shippingWarehouse: row.shipping_warehouse,
          vehicleInfo: row.vehicle_info,
          shippingNo: row.shipping_no,
          destination: row.destination,
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
          INSERT INTO shipping_records (
            order_id, sub_order_id, quantity, transport_type, shipping_type, 
            shipping_warehouse, vehicle_info, shipping_no, destination, operator_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id
        `, [
          data.orderId,
          data.subOrderId,
          data.quantity,
          data.transportType,
          data.shippingType,
          data.shippingWarehouse,
          data.vehicleInfo,
          data.shippingNo,
          data.destination,
          data.operatorId
        ]);

        // Update SubOrder shipped_quantity
        await client.query(`
          UPDATE sub_orders 
          SET shipped_quantity = COALESCE(shipped_quantity, 0) + $1,
              status = CASE 
                -- Completed Shipping
                WHEN COALESCE(shipped_quantity, 0) + $1 >= planned_quantity THEN 'completed'
                -- Partial Shipping
                ELSE 
                    CASE 
                        WHEN COALESCE(produced_quantity, 0) >= planned_quantity THEN 'shipping_completed_production'
                        ELSE 'shipping_during_production'
                    END
              END
          WHERE id = $2
        `, [data.quantity, data.subOrderId]);

        await client.query('COMMIT');

        return {
          statusCode: 201,
          body: JSON.stringify({ id: result.rows[0].id, message: 'Shipping record created' }),
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
