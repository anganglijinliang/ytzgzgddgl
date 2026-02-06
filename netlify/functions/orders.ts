import { pool } from './db';

export const handler = async (event, context) => {
  const { httpMethod, body } = event;

  try {
    const client = await pool.connect();

    try {
      if (httpMethod === 'GET') {
        // Fetch all orders with their items
        const result = await client.query(`
          SELECT 
            o.*, 
            json_agg(so.*) as items 
          FROM orders o
          LEFT JOIN sub_orders so ON o.id = so.order_id
          WHERE o.deleted_at IS NULL
          GROUP BY o.id
          ORDER BY o.created_at DESC
        `);
        
        // Transform keys from snake_case to camelCase for frontend compatibility
        const orders = result.rows.map(row => ({
          id: row.id,
          orderNo: row.order_no,
          customerName: row.customer_name,
          deliveryDate: row.delivery_date,
          workshop: row.workshop,
          warehouse: row.warehouse,
          remarks: row.remarks,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          createdBy: row.created_by,
          items: row.items.filter(item => item !== null).map(item => ({
            id: item.id,
            orderId: item.order_id,
            spec: item.spec,
            level: item.level,
            interfaceType: item.interface_type,
            lining: item.lining,
            length: item.length,
            coating: item.coating,
            plannedQuantity: item.planned_quantity,
            unitWeight: item.unit_weight,
            totalWeight: item.total_weight,
            batchNo: item.batch_no,
            producedQuantity: item.produced_quantity,
            pullingQuantity: item.pulling_quantity || 0,
            hydrostaticQuantity: item.hydrostatic_quantity || 0,
            liningQuantity: item.lining_quantity || 0,
            coatingQuantity: item.coating_quantity || 0,
            status: item.status
          }))
        }));

        return {
          statusCode: 200,
          body: JSON.stringify(orders),
        };
      } 
      
      else if (httpMethod === 'POST') {
        const data = JSON.parse(body);
        const { items, ...orderData } = data;

        await client.query('BEGIN');

        // Insert Order
        const orderResult = await client.query(`
          INSERT INTO orders (
            order_no, customer_name, delivery_date, workshop, warehouse, remarks, created_by, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new')
          RETURNING id
        `, [
          orderData.orderNo,
          orderData.customerName,
          orderData.deliveryDate,
          orderData.workshop,
          orderData.warehouse,
          orderData.remarks,
          orderData.createdBy
        ]);

        const orderId = orderResult.rows[0].id;

        // Insert Items (Bulk Insert)
        if (items.length > 0) {
          const values: any[] = [];
          const placeholders: string[] = [];
          let paramIndex = 1;

          items.forEach((item: any) => {
            placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`);
            values.push(
              orderId,
              item.spec,
              item.level,
              item.interfaceType,
              item.lining,
              item.length,
              item.coating,
              item.plannedQuantity,
              item.unitWeight,
              item.totalWeight,
              item.batchNo
            );
            paramIndex += 11;
          });

          const query = `
            INSERT INTO sub_orders (
              order_id, spec, level, interface_type, lining, length, coating, 
              planned_quantity, unit_weight, total_weight, batch_no
            ) VALUES ${placeholders.join(', ')}
          `;

          await client.query(query, values);
        }

        await client.query('COMMIT');

        return {
          statusCode: 201,
          body: JSON.stringify({ id: orderId, message: 'Order created successfully' }),
        };
      }

      else if (httpMethod === 'DELETE') {
        const { id } = event.queryStringParameters || {};
        
        if (!id) {
          return { statusCode: 400, body: 'Missing order ID' };
        }

        await client.query(`
          UPDATE orders 
          SET deleted_at = CURRENT_TIMESTAMP 
          WHERE id = $1
        `, [id]);

        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Order deleted successfully' }),
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
