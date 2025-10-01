import os

class Config:
    # Telegram Bot Configuration
    BOT_TOKEN = os.environ.get('BOT_TOKEN', '8252814138:AAEkx1SZis3-lO-Fm4ST8f0ZlRifS62u9k4')
    ADMIN_USER_ID = os.environ.get('ADMIN_USER_ID', '8039755235')
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///telegram_shop.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Payment Configuration
    KBZ_PAY_NUMBER = "09440823954"
    
    # Upload Configuration
    UPLOAD_FOLDER = 'static/uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size