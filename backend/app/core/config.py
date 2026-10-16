import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PARIKSHIT_ENV: str = "development"
    PARIKSHIT_DATA_DIR: str = "./data"
    PARIKSHIT_DB_URL: str = "sqlite:///./data/parikshit.db"
    VERSION: str = "2.1.0"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # LLM Gateway
    LLM_PROVIDER: str = "openai"  # watsonx | openai | anthropic | huggingface | mock
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    ANTHROPIC_API_KEY: str = ""
    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_BASE_URL: str = "https://router.huggingface.co/hf-inference/v1"

    # IBM watsonx.ai
    WATSONX_API_KEY: str = ""
    WATSONX_PROJECT_ID: str = ""
    WATSONX_URL: str = "https://us-south.ml.cloud.ibm.com"
    WATSONX_VERSION: str = "2024-05-31"
    WATSONX_DEFAULT_MODEL: str = "ibm/granite-3-8b-instruct"
    WATSONX_EMBEDDING_MODEL: str = "ibm/slate-30m-english-rtrvr"

    LLM_DEFAULT_MODEL: str = "gpt-4o-mini"
    LLM_BUILDER_MODEL: str = "gpt-4o"
    LLM_ADVERSARY_MODEL: str = "gpt-4o"
    LLM_REVIEWER_MODEL: str = "gpt-4o-mini"
    LLM_MAX_TOKENS_PER_SESSION: int = 100000
    LLM_DAILY_BUDGET_USD: float = 20.00

    # Sandbox
    SANDBOX_ENABLED: bool = False
    SANDBOX_IMAGE: str = "parikshit-sandbox:latest"
    SANDBOX_TIMEOUT_SEC: int = 120
    SANDBOX_NETWORK: str = "none"
    SANDBOX_MEMORY_LIMIT: str = "512m"
    SANDBOX_CPU_LIMIT: str = "1.0"

    # Repository Limits
    MAX_REPO_SIZE_MB: int = 200
    MAX_FILE_COUNT: int = 3000
    MAX_FILE_SIZE_MB: int = 5
    ALLOWED_GIT_HOSTS: str = "github.com,gitlab.com,bitbucket.org"
    PARIKSHIT_LOCAL_SOURCE_ROOTS: str = "./data/demo,data/demo"

    # Security & Auth
    AUTH_DISABLED: bool = True
    PARIKSHIT_API_KEY: str = ""
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

settings = Settings()

# Ensure data directory exists
data_path = Path(settings.PARIKSHIT_DATA_DIR)
data_path.mkdir(parents=True, exist_ok=True)
