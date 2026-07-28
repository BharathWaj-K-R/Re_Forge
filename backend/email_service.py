import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

# SMTP configuration
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "ReForge")


def send_otp_email(to_email: str, otp: str, purpose: str = "reset") -> bool:
    """
    Send a password-reset OTP email.

    Args:
        to_email: Recipient email address
        otp: 6-digit OTP code
        purpose: kept for forward-compatibility; only "reset" is used today

    Returns:
        True if sent successfully, False otherwise
    """
    if not all([SMTP_HOST, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL]):
        logger.warning(
            "SMTP not configured. OTP for %s: %s (purpose=%s)",
            to_email, otp, purpose
        )
        return False

    try:
        subject = "Reset your ReForge password"
        body = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>Your password reset code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 8px; text-align: center; background: #f0f0f0; padding: 20px; border-radius: 8px;">
                {otp}
            </h1>
            <p>This code expires in 10 minutes.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
        </body>
        </html>
        """

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        msg.attach(MIMEText(body, "html"))

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)

        logger.info("OTP email sent to %s (purpose=%s)", to_email, purpose)
        return True

    except Exception as e:
        logger.error("Failed to send OTP email to %s: %s", to_email, e)
        return False
