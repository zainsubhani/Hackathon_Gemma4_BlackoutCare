from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str
    APP_ENV: str = "development"
    SECRET_KEY: str
    PASSWORD_RESET_MASTER_PASSWORD: str
    BOOTSTRAP_ADMIN_TOKEN: str | None = None
    AUTH_COOKIE_SECURE: bool = False
    AUTH_COOKIE_SAMESITE: str = "lax"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    AUTH_MAX_FAILED_ATTEMPTS: int = 5
    AUTH_LOCKOUT_SECONDS: int = 300
    OLLAMA_URL: str = "http://localhost:11434/api/generate"
    OLLAMA_MODEL: str = "gemma:7b"
    OLLAMA_TIMEOUT_SECONDS: int = 30
    OLLAMA_EMBEDDING_URL: str = "http://localhost:11434/api/embeddings"
    OLLAMA_EMBEDDING_MODEL: str | None = None
    PROTOCOL_EMBEDDING_DIMENSIONS: int = 384

    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8")


settings = Settings()
