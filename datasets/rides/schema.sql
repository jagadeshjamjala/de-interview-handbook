-- Ride-sharing in 5 cities, calendar year 2024. Cancelled trips have no completed_at/fare.
CREATE TABLE drivers (driver_id INTEGER, name VARCHAR, city VARCHAR, joined_date DATE);
CREATE TABLE riders (rider_id INTEGER, name VARCHAR, city VARCHAR, signup_date DATE);
CREATE TABLE trips (trip_id INTEGER, driver_id INTEGER, rider_id INTEGER, city VARCHAR, requested_at TIMESTAMP, completed_at TIMESTAMP, status VARCHAR, fare DECIMAL(10,2));
CREATE TABLE ratings (trip_id INTEGER, rated_by VARCHAR, score INTEGER);
