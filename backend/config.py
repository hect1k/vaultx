from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ----- General -----
    SECRET_KEY: str
    VAULTX_ENCRYPTION_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ----- Admin User -----
    VAULTX_ADMIN_EMAIL: str
    VAULTX_ADMIN_PASSWORD: str
    VAULTX_ADMIN_FIRST_NAME: str
    VAULTX_ADMIN_LAST_NAME: str

    # ----- Database -----
    DB_HOST: str
    DB_PORT: int
    DB_USER: str
    DB_PASSWORD: str
    DB_NAME: str

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
