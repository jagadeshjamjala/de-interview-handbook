-- Product analytics for an app, users sign up during 2024. Some users never log in.
CREATE TABLE users (user_id INTEGER, signup_date DATE, country VARCHAR, plan VARCHAR);
CREATE TABLE logins (user_id INTEGER, login_ts TIMESTAMP);
CREATE TABLE page_views (user_id INTEGER, viewed_at TIMESTAMP, page VARCHAR);
CREATE TABLE sessions (session_id INTEGER, user_id INTEGER, started_at TIMESTAMP, ended_at TIMESTAMP, device VARCHAR);
