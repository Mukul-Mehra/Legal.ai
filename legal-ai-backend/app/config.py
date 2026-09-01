from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    gemini_api_key: str = ""
    database_url: str
    anthropic_api_key: str
    openai_api_key: str = ""
    environment: str = "development"

    # Signs login tokens. Required on purpose: no default means a missing
    # secret is a startup crash instead of a silent security hole.
    jwt_secret: str
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    class Config:
        env_file = ".env"

settings = Settings()