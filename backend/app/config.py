import logging

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://dmtool:dmtool_dev_password@db:5432/dmtool"
    DATABASE_URL_SYNC: str = "postgresql://dmtool:dmtool_dev_password@db:5432/dmtool"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # Auth / JWT
    SECRET_KEY: str = "CHANGE-ME-IN-PRODUCTION"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    model_config = {"env_file": ".env"}

    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        if not self.GROQ_API_KEY:
            raise ValueError(
                "GROQ_API_KEY must be set. "
                "Add it to your .env file or set the environment variable before starting the server."
            )
        if "dmtool_dev_password" in self.DATABASE_URL:
            logging.warning(
                "DATABASE_URL contains the default development password. "
                "Set a strong password in your .env file before deploying to production."
            )
        if self.SECRET_KEY == "CHANGE-ME-IN-PRODUCTION":
            logging.warning("SECRET_KEY is the default value. Set a secure key in production.")
        return self


settings = Settings()
