import os

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()


class Settings(BaseModel):
    APP_NAME: str = os.getenv("APP_NAME", "VaultX")
    APP_ENV: str = os.getenv("APP_ENV", "dev")
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "supersecretkey")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "supersecretjwtkey")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", 60))
    JWT_REFRESH_EXPIRE_DAYS: int = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", 30))

    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", 5432))
    DB_NAME: str = os.getenv("DB_NAME", "vaultx_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "postgres")

    STORAGE_PATH: str = os.getenv("STORAGE_PATH", "./storage")
    LOG_PATH: str = os.getenv("LOG_PATH", "./logs")


settings = Settings()
