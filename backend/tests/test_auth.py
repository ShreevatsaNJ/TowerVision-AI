import pytest

from app.services.auth_service import (
    AccountValidationError,
    AuthService,
    UsernameTakenError,
)


def test_accounts_sessions_and_logout_persist(tmp_path):
    database_path = tmp_path / "users.sqlite3"
    auth = AuthService(database_path)

    user = auth.register("TowerUser", "Secure-password-123")
    assert auth.authenticate("toweruser", "Secure-password-123")["id"] == user["id"]
    assert auth.authenticate("TowerUser", "wrong-password") is None

    with pytest.raises(UsernameTakenError):
        auth.register("toweruser", "Another-password-123")

    token, expires_at = auth.create_session(user["id"])
    restarted_auth = AuthService(database_path)
    assert restarted_auth.get_user_for_session(token)["username"] == "TowerUser"
    assert expires_at > 0

    restarted_auth.revoke_session(token)
    assert restarted_auth.get_user_for_session(token) is None


def test_registration_rejects_weak_credentials(tmp_path):
    auth = AuthService(tmp_path / "users.sqlite3")

    with pytest.raises(AccountValidationError):
        auth.register("ab", "short")

    with pytest.raises(AccountValidationError):
        auth.register("username with symbols!", "lowercase-password-1")

    user = auth.register("username with symbols!", "Uppercase-password-1")
    assert user["username"] == "username with symbols!"
