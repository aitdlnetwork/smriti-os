-- SHARD 2: SMRITI-OS Business Settings Database
-- This database stores global configurations and tax rules. High security, low write operations.

CREATE TABLE IF NOT EXISTS global_config (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS tax_matrices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tax_code VARCHAR(50) UNIQUE NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL
);

-- Insert default configurations
INSERT OR IGNORE INTO global_config (key, value, description) VALUES 
('company_name', 'SMRITI-OS Retailer', 'Set the receipt header standard.'),
('currency', 'INR', 'Default system currency.');
