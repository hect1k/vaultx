import os

from dotenv import load_dotenv
from pydantic import BaseModel, SecretStr

load_dotenv()


class Settings(BaseModel):
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

    MAIL_HOST: str = os.getenv("MAIL_HOST", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", 587))
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "login")
    MAIL_PASSWORD: SecretStr = SecretStr(
        os.getenv("MAIL_PASSWORD", "your_email_password")
    )
    MAIL_FROM: str = os.getenv("MAIL_FROM", "VaultX <login@vaultx.in>")
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", True) in ["true", "True"]
    MAIL_SSL_TLS: bool = os.getenv("MAIL_SSL_TLS", False) in ["true", "True"]

    DEV_FRONTEND_DOMAIN: str = os.getenv("DEV_FRONTEND_DOMAIN", "http://localhost:3000")
    PROD_FRONTEND_DOMAIN: str = os.getenv("PROD_FRONTEND_DOMAIN", "https://vaultx.in")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
