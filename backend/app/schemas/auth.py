from pydantic import BaseModel, Field, field_validator


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def trim_username(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value

    @field_validator("password")
    @classmethod
    def require_uppercase(cls, value: str) -> str:
        if not any(character.isupper() for character in value):
            raise ValueError("Password must include at least one uppercase letter.")
        return value


class LoginCredentials(BaseModel):
    username: str = Field(min_length=1, max_length=32)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username", mode="before")
    @classmethod
    def trim_username(cls, value: str) -> str:
        return value.strip() if isinstance(value, str) else value


class AuthUser(BaseModel):
    id: int
    username: str
    created_at: int


class AuthResponse(BaseModel):
    user: AuthUser


class SessionResponse(BaseModel):
    user: AuthUser | None
