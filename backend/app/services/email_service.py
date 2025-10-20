from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType
from pydantic import EmailStr, NameEmail

from app.core.config import Settings

settings = Settings()

conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_HOST,
    MAIL_STARTTLS=settings.MAIL_STARTTLS,
    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    USE_CREDENTIALS=True,
)


async def send_magic_link(email: EmailStr, token: str):
    link = f"{settings.DEV_FRONTEND_DOMAIN}/login?token={token}&email={email}"

    if settings.APP_ENV == "prod":
        link = f"{settings.PROD_FRONTEND_DOMAIN}/login?token={token}&email={email}"

    html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>VaultX Magic Link</title>
          <style>
            body {{
              font-family: Arial, sans-serif;
              background-color: #f4f4f7;
              color: #333333;
              margin: 0;
              padding: 0;
            }}
            .container {{
              max-width: 600px;
              margin: 40px auto;
              padding: 20px;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }}
            .button {{
              display: inline-block;
              padding: 12px 24px;
              margin-top: 20px;
              font-size: 16px;
              color: #ffffff;
              background-color: #4f46e5;
              text-decoration: none;
              border-radius: 6px;
            }}
            .footer {{
              margin-top: 30px;
              font-size: 12px;
              color: #888888;
              text-align: center;
            }}
          </style>
        </head>
        <body>
          <div class="container">
            <h2>VaultX Magic Login Link</h2>
            <p>Hello,</p>
            <p>Click the button below to log in to your VaultX account. This link is valid only for 15 minutes.</p>
            <a href="{link}" class="button">Log in to VaultX</a>
            <p class="footer">
              If you did not request this email, you can safely ignore it.
            </p>
          </div>
        </body>
        </html>
        """

    message = MessageSchema(
        subject="Your VaultX Magic Login Link",
        recipients=[NameEmail(email, email)],
        body=html_body,
        subtype=MessageType.html,
    )

    fm = FastMail(conf)
    await fm.send_message(message)
