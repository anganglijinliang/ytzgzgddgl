-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    avatar TEXT,
    password_hash TEXT,
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
    pulling_quantity INTEGER DEFAULT 0, -- 拉管
    hydrostatic_quantity INTEGER DEFAULT 0, -- 水压
    lining_quantity INTEGER DEFAULT 0, -- 衬管
    coating_quantity INTEGER DEFAULT 0, -- 外防
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
    heat_no TEXT, -- 炉号
    process TEXT DEFAULT 'packaging', -- 工序: pulling, hydrostatic, lining, packaging
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Production Plans Table (Dispatcher -> Workshop)
CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    sub_order_id UUID REFERENCES sub_orders(id),
    workshop TEXT NOT NULL,
    team TEXT,
    shift TEXT,
    planned_date DATE,
    quantity INTEGER NOT NULL,
    process TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migrations (Idempotent)
ALTER TABLE production_records ADD COLUMN IF NOT EXISTS pressure NUMERIC;
ALTER TABLE production_records ADD COLUMN IF NOT EXISTS pressure_time INTEGER;
ALTER TABLE production_records ADD COLUMN IF NOT EXISTS zinc_weight NUMERIC;
ALTER TABLE production_records ADD COLUMN IF NOT EXISTS lining_thickness NUMERIC;
