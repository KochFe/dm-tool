from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://dmtool:dmtool_dev_password@db:5432/dmtool"
    DATABASE_URL_SYNC: str = "postgresql://dmtool:dmtool_dev_password@db:5432/dmtool"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    model_config = {"env_file": ".env"}


settings = Settings()
