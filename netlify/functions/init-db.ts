import { pool } from './db';

const schema = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Master Data Table (Key-Value storage for flexible configuration)
CREATE TABLE IF NOT EXISTS master_data (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    delivery_date DATE,
    workshop TEXT,
    warehouse TEXT,
    remarks TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_by TEXT REFERENCES users(username),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- SubOrders (Order Items) Table
CREATE TABLE IF NOT EXISTS sub_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    spec TEXT NOT NULL,
    level TEXT NOT NULL,
    interface_type TEXT NOT NULL,
    lining TEXT NOT NULL,
    length TEXT NOT NULL,
    coating TEXT NOT NULL,
    planned_quantity INTEGER NOT NULL,
    unit_weight NUMERIC(10, 3),
    total_weight NUMERIC(12, 3),
    batch_no TEXT,
    produced_quantity INTEGER DEFAULT 0,
    pulling_quantity INTEGER DEFAULT 0, -- 拉管
    hydrostatic_quantity INTEGER DEFAULT 0, -- 水压
    lining_quantity INTEGER DEFAULT 0, -- 衬管
    shipped_quantity INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'new'
);

-- Production Records Table
CREATE TABLE IF NOT EXISTS production_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    sub_order_id UUID REFERENCES sub_orders(id),
    team TEXT NOT NULL,
    shift TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    workshop TEXT,
    warehouse TEXT,
    operator_id TEXT NOT NULL,
    heat_no TEXT,
    process TEXT DEFAULT 'packaging',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration for existing tables (Idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_records' AND column_name='heat_no') THEN
        ALTER TABLE production_records ADD COLUMN heat_no TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_records' AND column_name='process') THEN
        ALTER TABLE production_records ADD COLUMN process TEXT DEFAULT 'packaging';
    END IF;

    -- SubOrders Migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_orders' AND column_name='pulling_quantity') THEN
        ALTER TABLE sub_orders ADD COLUMN pulling_quantity INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_orders' AND column_name='hydrostatic_quantity') THEN
        ALTER TABLE sub_orders ADD COLUMN hydrostatic_quantity INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sub_orders' AND column_name='lining_quantity') THEN
        ALTER TABLE sub_orders ADD COLUMN lining_quantity INTEGER DEFAULT 0;
    END IF;
END $$;

-- Shipping Records Table
CREATE TABLE IF NOT EXISTS shipping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    sub_order_id UUID REFERENCES sub_orders(id),
    quantity INTEGER NOT NULL,
    transport_type TEXT NOT NULL,
    shipping_type TEXT NOT NULL,
    shipping_warehouse TEXT,
    vehicle_info TEXT,
    shipping_no TEXT,
    destination TEXT,
    operator_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initial Data Seeding
INSERT INTO users (username, name, role) 
VALUES 
    ('admin', '系统管理员', 'admin'),
    ('entry', '订单录入员', 'order_entry'),
    ('prod', '生产主管', 'production'),
    ('ship', '发运主管', 'shipping')
ON CONFLICT (username) DO NOTHING;

INSERT INTO master_data (key, value)
VALUES 
    ('specs', '["DN100", "DN200", "DN300", "DN400", "DN500", "DN600", "DN800", "DN1000", "DN1200"]'::jsonb),
    ('levels', '["K9", "K8", "K7", "C40", "C30", "C25"]'::jsonb),
    ('interfaces', '["T型", "K型", "S型", "法兰"]'::jsonb),
    ('linings', '["水泥砂浆", "环氧陶瓷", "聚氨酯"]'::jsonb),
    ('lengths', '["6米", "5.7米", "8米"]'::jsonb),
    ('coatings', '["沥青漆", "环氧树脂", "锌层+沥青"]'::jsonb),
    ('warehouses', '["成品库A", "成品库B", "待发区"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
`;

export const handler = async (event, context) => {
  // Only allow POST requests to prevent accidental execution
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Database initialized successfully' }),
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to initialize database', details: error.message }),
    };
  }
};
