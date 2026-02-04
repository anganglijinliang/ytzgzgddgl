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
    value JSONB NOT NULL, -- Storing arrays like specs, levels as JSON arrays
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
    created_by TEXT REFERENCES users(username), -- Storing username for audit or link to user ID if preferred, currently username in store
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    operator_id TEXT NOT NULL, -- Could be username or user UUID
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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

-- Initial Data Seeding (Optional: only if empty)
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
