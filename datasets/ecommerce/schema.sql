-- Online store, calendar year 2024. Guest checkouts have customer_id = NULL.
CREATE TABLE customers (customer_id INTEGER, name VARCHAR, country VARCHAR, signup_date DATE);
CREATE TABLE products (product_id INTEGER, name VARCHAR, category VARCHAR, price DECIMAL(10,2));
CREATE TABLE orders (order_id INTEGER, customer_id INTEGER, order_date DATE, status VARCHAR);
CREATE TABLE order_items (order_id INTEGER, product_id INTEGER, quantity INTEGER, unit_price DECIMAL(10,2));
