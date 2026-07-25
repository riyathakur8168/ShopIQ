import os
from datetime import timedelta
from dotenv import load_dotenv
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Render and Heroku use 'postgres://', but SQLAlchemy requires 'postgresql://'
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

_IS_PRODUCTION = os.environ.get('FLASK_ENV') == 'production'

def _require_secret(env_var: str, dev_fallback: str) -> str:
    """Return env var value. In production, raise if not set."""
    value = os.environ.get(env_var)
    if not value:
        if _IS_PRODUCTION:
            raise RuntimeError(
                f"[SECURITY] Environment variable '{env_var}' is required in production. "
                "Set it before starting the server."
            )
        return dev_fallback
    return value

class Config:
    # Flask secret (session signing)
    SECRET_KEY = _require_secret(
        'SECRET_KEY',
        dev_fallback='dev-only-secret-change-in-production'
    )

    # Database
    SQLALCHEMY_DATABASE_URI = database_url or 'sqlite:///' + os.path.join(BASE_DIR, 'shopiq_v2.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY = _require_secret(
        'JWT_SECRET_KEY',
        dev_fallback='dev-only-jwt-secret-change-in-production'
    )
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(
        seconds=int(os.environ.get('JWT_ACCESS_TOKEN_EXPIRES_SECONDS', 86400))  # default 24h
    )

    # CORS — restrict to your frontend URL in production
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    # Resend email configuration
    RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
    FROM_EMAIL = os.environ.get("FROM_EMAIL")
    
