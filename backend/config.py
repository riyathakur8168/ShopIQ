import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# Render and Heroku use 'postgres://', but SQLAlchemy requires 'postgresql://'
database_url = os.environ.get('DATABASE_URL')
if database_url and database_url.startswith('postgres://'):
    database_url = database_url.replace('postgres://', 'postgresql://', 1)

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'you-will-never-guess'
    SQLALCHEMY_DATABASE_URI = database_url or 'sqlite:///' + os.path.join(BASE_DIR, 'shopiq_v2.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key-which-is-at-least-32-bytes-long'
