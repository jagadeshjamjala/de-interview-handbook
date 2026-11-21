-- Payments, calendar year 2024. transactions contains replays (several copies per txn_id;
-- latest ingested_at wins). fx_rates: 1 unit of currency = usd_rate USD, business days only, no USD row.
CREATE TABLE accounts (account_id INTEGER, customer_name VARCHAR, country VARCHAR, currency VARCHAR, opened_date DATE);
CREATE TABLE transactions (txn_id INTEGER, account_id INTEGER, txn_ts TIMESTAMP, amount DECIMAL(14,2), currency VARCHAR, txn_type VARCHAR, status VARCHAR, ingested_at TIMESTAMP);
CREATE TABLE fx_rates (rate_date DATE, currency VARCHAR, usd_rate DECIMAL(12,6));
CREATE TABLE chargebacks (chargeback_id INTEGER, txn_id INTEGER, filed_date DATE, amount DECIMAL(14,2), reason VARCHAR);
