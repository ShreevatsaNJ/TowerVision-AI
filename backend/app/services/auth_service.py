import hashlib
import hmac
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from fastapi import HTTPException, Request

from app.config import settings

SESSION_COOKIE_NAME = "towervision_session"
SESSION_TTL_SECONDS = 14 * 24 * 60 * 60
PASSWORD_HASH_ITERATIONS = 600_000
_DUMMY_SALT = b"tower-vision-invalid-user-salt"


class AccountValidationError(Exception):
    pass


class UsernameTakenError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class AuthService:
    def __init__(self, database_path: str | Path | None = None):
        self.database_path = Path(database_path or settings.AUTH_DB_PATH).resolve()
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(str(self.database_path), timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
                    password_salt BLOB NOT NULL,
                    password_hash BLOB NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    expires_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
                """
            )

    @staticmethod
    def _hash_password(password: str, salt: bytes) -> bytes:
        return hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS
        )

    @staticmethod
    def _public_user(row: sqlite3.Row) -> dict:
        return {
            "id": row["id"],
            "username": row["username"],
            "created_at": row["created_at"],
        }

    def register(self, username: str, password: str) -> dict:
        username = username.strip()
        if not 3 <= len(username) <= 32:
            raise AccountValidationError("Username must be between 3 and 32 characters.")
        if not 8 <= len(password) <= 128:
            raise AccountValidationError("Password must be between 8 and 128 characters.")
        if not any(character.isupper() for character in password):
            raise AccountValidationError("Password must include at least one uppercase letter.")

        salt = secrets.token_bytes(16)
        password_hash = self._hash_password(password, salt)
        created_at = int(time.time())
        try:
            with self._connect() as connection:
                cursor = connection.execute(
                    "INSERT INTO users (username, password_salt, password_hash, created_at) VALUES (?, ?, ?, ?)",
                    (username, salt, password_hash, created_at),
                )
                user_id = cursor.lastrowid
        except sqlite3.IntegrityError as error:
            raise UsernameTakenError from error

        return {"id": user_id, "username": username, "created_at": created_at}

    def authenticate(self, username: str, password: str) -> dict | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT * FROM users WHERE username = ? COLLATE NOCASE",
                (username.strip(),),
            ).fetchone()

        if row is None:
            hmac.compare_digest(self._hash_password(password, _DUMMY_SALT), bytes(32))
            return None

        candidate = self._hash_password(password, row["password_salt"])
        if not hmac.compare_digest(candidate, row["password_hash"]):
            return None
        return self._public_user(row)

    def create_session(self, user_id: int) -> tuple[str, int]:
        token = secrets.token_urlsafe(32)
        expires_at = int(time.time()) + SESSION_TTL_SECONDS
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with self._connect() as connection:
            connection.execute(
                "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
                (token_hash, user_id, expires_at, int(time.time())),
            )
        return token, expires_at

    def get_user_for_session(self, token: str | None) -> dict | None:
        if not token:
            return None
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT users.* FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ?
                """,
                (token_hash, int(time.time())),
            ).fetchone()
        return self._public_user(row) if row else None

    def revoke_session(self, token: str | None) -> None:
        if not token:
            return
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


auth_service = AuthService()


def require_current_user(request: Request) -> dict:
    user = auth_service.get_user_for_session(request.cookies.get(SESSION_COOKIE_NAME))
    if user is None:
        raise HTTPException(status_code=401, detail="Please log in to continue.")
    return user
