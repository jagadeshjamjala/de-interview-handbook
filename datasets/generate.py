"""Deterministic synthetic datasets -> Parquet for the SQL playground and CI.

Plain Python + stdlib random only: no Faker, no math/gauss (libm can differ between
platforms), money and FX rates as integers. Same pinned duckdb -> byte-identical files.

Usage: python datasets/generate.py
Writes apps/website/static/datasets/<dataset>/<table>.parquet, manifest.json and
datasets/checksums.sha256. CI regenerates and fails if anything changed.
"""

import csv
import hashlib
import json
import random
import tempfile
from datetime import date, datetime, timedelta
from pathlib import Path

import duckdb

ROOT = Path(__file__).resolve().parent.parent
HERE = ROOT / "datasets"
OUT = ROOT / "apps/website/static/datasets"
SEED = 20240101
Y0, Y1 = date(2024, 1, 1), date(2024, 12, 31)
DAYS = (Y1 - Y0).days + 1
NULL = r"\N"
MAX_BYTES = 5 * 1024 * 1024

FIRST = ["Ava", "Ben", "Chen", "Diya", "Eli", "Fatima", "Gus", "Hana", "Ivan", "Jade",
         "Kofi", "Lena", "Mateo", "Nora", "Omar", "Priya", "Quinn", "Rosa", "Sam", "Tara",
         "Uma", "Vik", "Wen", "Yusuf", "Zoe"]
LAST = ["Adams", "Bose", "Costa", "Dubois", "Evans", "Fischer", "Garcia", "Hughes", "Ito",
        "Jensen", "Khan", "Lopez", "Meyer", "Nakamura", "Okafor", "Patel", "Rossi", "Silva",
        "Tanaka", "Walsh"]


def money(cents):
    return f"{cents // 100}.{cents % 100:02d}"


def ts(dt):
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def person(r):
    return f"{r.choice(FIRST)} {r.choice(LAST)}"


def day_between(r, start, end):
    return start + timedelta(days=r.randint(0, (end - start).days))


def pick(r, values, weights):
    return r.choices(values, weights)[0]


def ecommerce(r):
    customers = [
        (cid, person(r), pick(r, ["US", "GB", "DE", "IN", "BR", "CA"], [40, 15, 12, 15, 10, 8]),
         day_between(r, date(2023, 1, 1), Y1))
        for cid in range(1, 601)
    ]
    categories = {  # price range in cents
        "Books": ("Novel", 800, 4000), "Electronics": ("Headphones", 2000, 30000),
        "Home": ("Lamp", 1000, 15000), "Toys": ("Puzzle", 500, 6000),
        "Sports": ("Yoga Mat", 1500, 20000), "Beauty": ("Serum", 500, 5000),
        "Garden": ("Planter", 1000, 12000), "Grocery": ("Coffee", 200, 2000),
    }
    adjectives = ["Classic", "Compact", "Deluxe", "Eco", "Everyday", "Mini", "Pro", "Smart",
                  "Ultra", "Vintage"]
    products, price = [], {}
    for cat, (noun, lo, hi) in categories.items():
        for adj in adjectives:
            pid = len(products) + 1
            price[pid] = r.randint(lo, hi)
            products.append((pid, f"{adj} {noun}", cat, money(price[pid])))

    active = [c for c in customers if r.random() < 0.85]  # the rest never order
    orders, items = [], []
    for oid in range(1, 6001):
        if r.random() < 0.08:  # guest checkout
            cust, d = None, day_between(r, Y0, Y1)
        else:
            c = r.choice(active)
            cust, d = c[0], day_between(r, max(c[3], Y0), Y1)
        status = pick(r, ["completed", "cancelled", "returned", "pending"], [80, 8, 5, 7])
        orders.append((oid, cust, d, status))
        for pid in r.sample(sorted(price), pick(r, [1, 2, 3, 4, 5], [35, 30, 18, 10, 7])):
            unit = price[pid] if r.random() < 0.85 else price[pid] * 9 // 10
            items.append((oid, pid, pick(r, [1, 2, 3, 4], [60, 25, 10, 5]), money(unit)))
    return {"customers": customers, "products": products, "orders": orders, "order_items": items}


def rides(r):
    cities = {"Austin": 10, "Boston": 8, "Chicago": 12, "Denver": 4, "Seattle": 2}  # mean requests/day
    hour_w = [1, 1, 1, 1, 1, 2, 4, 8, 10, 7, 5, 5, 6, 5, 5, 6, 8, 10, 9, 7, 6, 5, 3, 2]
    drivers, riders, city_drivers, city_riders = [], [], {}, {}
    for city in cities:
        for _ in range(40):
            did = len(drivers) + 1
            drivers.append((did, person(r), city, day_between(r, date(2021, 1, 1), date(2023, 12, 31))))
            city_drivers.setdefault(city, []).append(did)
        for _ in range(300):
            rid = len(riders) + 1
            riders.append((rid, person(r), city, day_between(r, date(2022, 1, 1), date(2024, 6, 30))))
            city_riders.setdefault(city, []).append(rid)

    trips, ratings = [], []
    for day in range(DAYS):
        d = Y0 + timedelta(days=day)
        for city, mean in cities.items():
            for _ in range(sum(r.random() < 0.5 for _ in range(2 * mean))):
                tid = len(trips) + 1
                req = datetime(d.year, d.month, d.day, pick(r, list(range(24)), hour_w),
                               r.randint(0, 59), r.randint(0, 59))
                rider = r.choice(city_riders[city])
                if r.random() < 0.87:
                    minutes = r.randint(6, 55)
                    done = req + timedelta(minutes=minutes, seconds=r.randint(0, 59))
                    fare = 250 + minutes * r.randint(80, 140)
                    trips.append((tid, r.choice(city_drivers[city]), rider, city, ts(req), ts(done),
                                  "completed", money(fare)))
                    if r.random() < 0.7:
                        ratings.append((tid, "rider", pick(r, [1, 2, 3, 4, 5], [2, 3, 8, 27, 60])))
                    if r.random() < 0.6:
                        ratings.append((tid, "driver", pick(r, [1, 2, 3, 4, 5], [1, 2, 6, 31, 60])))
                else:  # cancelled before or after a driver was assigned
                    drv = r.choice(city_drivers[city]) if r.random() < 0.5 else None
                    trips.append((tid, drv, rider, city, ts(req), None, "cancelled", None))
    return {"drivers": drivers, "riders": riders, "trips": trips, "ratings": ratings}


def payments(r):
    currency_of = {"US": "USD", "GB": "GBP", "DE": "EUR", "FR": "EUR", "IN": "INR", "JP": "JPY"}
    accounts = []
    for aid in range(1, 401):
        country = pick(r, list(currency_of), [35, 15, 12, 8, 18, 12])
        accounts.append((aid, person(r), country, currency_of[country],
                         day_between(r, date(2020, 1, 1), date(2023, 12, 31))))

    # usd_rate in millionths; business days only, two holidays, starts before the first txn.
    rate = {"EUR": 1_090_000, "GBP": 1_270_000, "INR": 12_000, "JPY": 6_700}
    holidays = {date(2024, 1, 1), date(2024, 12, 25)}
    fx, d = [], date(2023, 12, 1)
    while d <= Y1:
        if d.weekday() < 5 and d not in holidays:
            for cur in sorted(rate):
                rate[cur] += r.randint(-rate[cur] // 200, rate[cur] // 200)
                fx.append((d, cur, f"{rate[cur] // 1_000_000}.{rate[cur] % 1_000_000:06d}"))
        d += timedelta(days=1)

    scale = {"USD": 1, "EUR": 1, "GBP": 1, "INR": 83, "JPY": 150}
    txns, settled_payments = [], []
    for tid in range(1, 15001):
        acct = r.choice(accounts)
        cur = acct[3]
        t = datetime(2024, 1, 1) + timedelta(seconds=r.randint(0, DAYS * 86400 - 1))
        cents = r.randint(500, 200_000) * scale[cur]
        kind = pick(r, ["payment", "refund", "transfer"], [85, 10, 5])
        final = pick(r, ["settled", "failed", "pending"], [88, 7, 5])
        seen_at = t + timedelta(seconds=r.randint(1, 120))
        copies = []
        if final != "pending" and r.random() < 0.6:  # first seen as pending, updated later
            copies.append(("pending", seen_at))
            seen_at += timedelta(seconds=r.randint(3600, 172_800))
        copies.append((final, seen_at))
        if r.random() < 0.08:  # replay of the latest copy
            copies.append((final, seen_at + timedelta(seconds=r.randint(60, 86_400))))
        for status, at in copies:
            txns.append((tid, acct[0], ts(t), money(cents), cur, kind, status, ts(at)))
        if final == "settled" and kind == "payment":
            settled_payments.append((tid, t.date(), cents))

    reasons = ["fraud", "not_received", "duplicate", "not_as_described"]
    chargebacks = [
        (len_cb + 1, tid, d + timedelta(days=r.randint(5, 60)), money(cents), r.choice(reasons))
        for len_cb, (tid, d, cents) in enumerate(p for p in settled_payments if r.random() < 0.012)
    ]
    return {"accounts": accounts, "transactions": txns, "fx_rates": fx, "chargebacks": chargebacks}


def events(r):
    pages = ["/", "/pricing", "/docs", "/dashboard", "/settings", "/reports", "/billing", "/search"]
    users, logins, views, sessions = [], [], [], []
    for uid in range(1, 1001):
        signup = day_between(r, Y0, Y1)
        users.append((uid, signup, pick(r, ["US", "GB", "IN", "DE", "BR"], [40, 15, 20, 15, 10]),
                      pick(r, ["free", "pro", "team"], [75, 20, 5])))
        if r.random() < 0.1:  # signs up, never logs in
            continue
        p, decay = r.choice([0.9, 0.7, 0.5, 0.3]), r.choice([0.97, 0.98, 0.99])
        d = signup
        while d <= Y1 and p > 0.02:
            if r.random() < p:
                for _ in range(pick(r, [1, 2, 3], [60, 30, 10])):
                    at = datetime(d.year, d.month, d.day) + timedelta(seconds=r.randint(0, 86_399))
                    logins.append((uid, ts(at)))
                    end = at + timedelta(seconds=r.randint(30, 3600))
                    sessions.append((len(sessions) + 1, uid, ts(at), ts(end),
                                     pick(r, ["web", "ios", "android"], [50, 30, 20])))
                    if r.random() < 0.6:
                        v = at
                        for _ in range(r.randint(1, 8)):
                            views.append((uid, ts(v), r.choice(pages)))
                            g = r.random()  # 3% exactly 30 min (same session), 7% > 30 min (new one)
                            gap = 1800 if g < 0.03 else r.randint(1801, 5400) if g < 0.10 else r.randint(5, 600)
                            v += timedelta(seconds=gap)
            p *= decay
            d += timedelta(days=1)
    return {"users": users, "logins": logins, "page_views": views, "sessions": sessions}


# Edge cases the questions rely on. Each query must return true.
INVARIANTS = {
    "ecommerce": [
        "SELECT COUNT(*) > 0 FROM orders WHERE customer_id IS NULL",
        "SELECT COUNT(*) > 0 FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id)",
        "SELECT COUNT(*) > 0 FROM (SELECT order_id FROM order_items GROUP BY 1 HAVING COUNT(*) > 1)",
    ],
    "rides": [
        "SELECT COUNT(*) < 366 FROM (SELECT DISTINCT CAST(requested_at AS DATE) FROM trips WHERE city = 'Seattle' AND status = 'completed')",
        "SELECT COUNT(*) > 0 FROM trips WHERE status = 'cancelled' AND driver_id IS NULL",
    ],
    "payments": [
        "SELECT COUNT(*) > 0 FROM (SELECT txn_id FROM transactions GROUP BY 1 HAVING COUNT(DISTINCT status) > 1)",
        "SELECT COUNT(*) > 0 FROM (SELECT txn_id FROM transactions GROUP BY 1 HAVING COUNT(*) > COUNT(DISTINCT status))",
        "SELECT COUNT(*) = 0 FROM (SELECT txn_id, ingested_at FROM transactions GROUP BY 1, 2 HAVING COUNT(*) > 1)",
        "SELECT COUNT(*) > 0 FROM transactions WHERE dayofweek(txn_ts) IN (0, 6) AND currency <> 'USD'",
        "SELECT MIN(rate_date) < DATE '2024-01-01' FROM fx_rates",
        "SELECT COUNT(*) = 0 FROM fx_rates WHERE currency = 'USD'",
    ],
    "events": [
        "SELECT COUNT(*) > 0 FROM users u WHERE NOT EXISTS (SELECT 1 FROM logins l WHERE l.user_id = u.user_id)",
        "SELECT COUNT(*) > 0 FROM (SELECT user_id, CAST(login_ts AS DATE) FROM logins GROUP BY 1, 2 HAVING COUNT(*) > 1)",
        "SELECT COUNT(*) > 0 FROM (SELECT viewed_at - LAG(viewed_at) OVER (PARTITION BY user_id ORDER BY viewed_at) AS gap FROM page_views) WHERE gap = INTERVAL 30 MINUTE",
    ],
}


def build(name, tables):
    con = duckdb.connect()
    con.execute("SET threads = 1")  # single writer thread keeps Parquet bytes stable
    con.execute((HERE / name / "schema.sql").read_text())
    out = OUT / name
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    with tempfile.TemporaryDirectory() as tmp:
        for table, rows in tables.items():
            path = Path(tmp) / f"{table}.csv"
            with path.open("w", newline="") as f:
                csv.writer(f).writerows([NULL if v is None else v for v in row] for row in rows)
            con.execute(f"COPY {table} FROM '{path}' (HEADER false, NULLSTR '{NULL}')")
            con.execute(f"COPY (SELECT * FROM {table} ORDER BY ALL) TO '{out / table}.parquet' "
                        "(FORMAT parquet, COMPRESSION zstd)")
            columns = con.execute(f"DESCRIBE {table}").fetchall()
            manifest[table] = {"rows": len(rows), "columns": [{"name": c[0], "type": c[1]} for c in columns]}
    for sql in INVARIANTS[name]:
        assert con.execute(sql).fetchone()[0], f"{name}: invariant failed: {sql}"
    size = sum(p.stat().st_size for p in out.glob("*.parquet"))
    assert size <= MAX_BYTES, f"{name}: {size} bytes > 5 MB budget"
    print(f"  {name}: " + ", ".join(f"{t} {m['rows']}" for t, m in manifest.items()) + f" ({size // 1024} KB)")
    return manifest


def main():
    generators = {"ecommerce": ecommerce, "rides": rides, "payments": payments, "events": events}
    manifest = {name: build(name, gen(random.Random(SEED + i)))
                for i, (name, gen) in enumerate(generators.items())}
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    lines = [f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(ROOT).as_posix()}"
             for p in sorted(OUT.rglob("*")) if p.is_file()]
    (HERE / "checksums.sha256").write_text("\n".join(lines) + "\n")
    print(f"✓ {len(lines)} files, checksums → datasets/checksums.sha256")


if __name__ == "__main__":
    main()
