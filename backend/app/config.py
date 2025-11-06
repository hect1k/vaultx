from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_env: str = Field("dev", alias="APP_ENV")
    app_secret_key: str = Field(..., alias="APP_SECRET_KEY")
    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    jwt_expire_minutes: int = Field(60, alias="JWT_EXPIRE_MINUTES")
    jwt_refresh_expire_days: int = Field(30, alias="JWT_REFRESH_EXPIRE_DAYS")

    # Database
    db_host: str = Field(..., alias="DB_HOST")
    db_port: int = Field(..., alias="DB_PORT")
    db_name: str = Field(..., alias="DB_NAME")
    db_user: str = Field(..., alias="DB_USER")
    db_password: str = Field(..., alias="DB_PASSWORD")

    # Mail
    mail_host: str = Field(..., alias="MAIL_HOST")
    mail_port: int = Field(..., alias="MAIL_PORT")
    mail_username: str = Field(..., alias="MAIL_USERNAME")
    mail_password: str = Field(..., alias="MAIL_PASSWORD")
    mail_from: str = Field(..., alias="MAIL_FROM")
    mail_starttls: bool = Field(True, alias="MAIL_STARTTLS")
    mail_ssl_tls: bool = Field(False, alias="MAIL_SSL_TLS")

    # Frontend
    dev_frontend_url: str = Field("http://localhost:3000", alias="DEV_FRONTEND_URL")
    prod_frontend_url: str = Field("https://vaultx.in", alias="PROD_FRONTEND_URL")

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
