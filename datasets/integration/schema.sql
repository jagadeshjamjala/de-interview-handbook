-- A daily CRM customer feed for March 2024 (one CSV per business day), as an ETL team receives it.
-- feed_files is the control table; customer_feed holds the raw lines, every column still text.
-- Planted problems: a missing day, a resent duplicate file, late files, a truncated file,
-- and bad rows (blank or padded codes, bad emails, country names, unparseable timestamps).
-- customers_target is the warehouse table as of 2024-02-29 (some emails are NULL).
CREATE TABLE feed_files (file_name VARCHAR, feed VARCHAR, business_date DATE, received_at TIMESTAMP, declared_rows INTEGER);
CREATE TABLE customer_feed (file_name VARCHAR, line_no INTEGER, customer_code VARCHAR, full_name VARCHAR, email VARCHAR, country VARCHAR, updated_at VARCHAR);
CREATE TABLE customers_target (customer_code VARCHAR, full_name VARCHAR, email VARCHAR, country VARCHAR, updated_at TIMESTAMP);
