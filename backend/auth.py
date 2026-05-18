import sqlite3
import hashlib
import secrets
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "halify.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as conn:
        # migrate: add preferences column if missing
        try:
            conn.execute("ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}'")
        except Exception:
            pass
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                openai_api_key TEXT DEFAULT '',
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                summary TEXT DEFAULT '',
                data TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );
        """)


def _hash_password(password: str, salt: str = None):
    if salt is None:
        salt = secrets.token_hex(16)
    hashed = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()
    return hashed, salt


def create_user(name: str, email: str, password: str):
    hashed, salt = _hash_password(password)
    password_hash = f"{salt}${hashed}"
    try:
        with get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
                (name, email.lower().strip(), password_hash),
            )
            return {"id": cur.lastrowid, "name": name, "email": email.lower().strip(), "openai_api_key": ""}
    except sqlite3.IntegrityError:
        return None


def verify_user(email: str, password: str):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),)).fetchone()
    if not row:
        return None
    stored = row["password_hash"]
    if "$" not in stored:
        return None
    salt, stored_hash = stored.split("$", 1)
    hashed, _ = _hash_password(password, salt)
    if hashed != stored_hash:
        return None
    return dict(row)


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_conn() as conn:
        conn.execute("INSERT INTO sessions (user_id, token) VALUES (?, ?)", (user_id, token))
    return token


def get_user_by_token(token: str):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token = ?",
            (token,),
        ).fetchone()
    return dict(row) if row else None


def delete_session(token: str):
    with get_conn() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def update_api_key(user_id: int, api_key: str):
    with get_conn() as conn:
        conn.execute("UPDATE users SET openai_api_key = ? WHERE id = ?", (api_key, user_id))


# ── History ──────────────────────────────────────────────────────────

MAPS_HISTORY_LIMIT = 3

def save_history(user_id: int, type_: str, title: str, summary: str, data: str) -> dict:
    """Save a history entry. For 'maps' type, auto-prune to keep only the latest 3."""
    with get_conn() as conn:
        if type_ == "maps":
            rows = conn.execute(
                "SELECT id FROM history WHERE user_id=? AND type='maps' ORDER BY created_at ASC",
                (user_id,)
            ).fetchall()
            if len(rows) >= MAPS_HISTORY_LIMIT:
                ids_to_delete = [r["id"] for r in rows[:len(rows) - MAPS_HISTORY_LIMIT + 1]]
                conn.execute(f"DELETE FROM history WHERE id IN ({','.join('?'*len(ids_to_delete))})", ids_to_delete)
        cur = conn.execute(
            "INSERT INTO history (user_id, type, title, summary, data) VALUES (?,?,?,?,?)",
            (user_id, type_, title, summary, data),
        )
        row = conn.execute("SELECT * FROM history WHERE id=?", (cur.lastrowid,)).fetchone()
        return dict(row)


def get_history(user_id: int) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM history WHERE user_id=? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
    return [dict(r) for r in rows]


def delete_history(entry_id: int, user_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute(
            "DELETE FROM history WHERE id=? AND user_id=?", (entry_id, user_id)
        )
    return cur.rowcount > 0


# ── User preferences ──────────────────────────────────────────────────

def get_preferences(user_id: int) -> dict:
    with get_conn() as conn:
        row = conn.execute("SELECT preferences FROM users WHERE id=?", (user_id,)).fetchone()
    if not row or not row["preferences"]:
        return {}
    try:
        return json.loads(row["preferences"])
    except Exception:
        return {}


def save_preferences(user_id: int, prefs: dict):
    with get_conn() as conn:
        conn.execute("UPDATE users SET preferences=? WHERE id=?", (json.dumps(prefs), user_id))
