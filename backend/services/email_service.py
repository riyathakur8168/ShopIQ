import resend
from flask import current_app


def send_email_otp(to_email: str, otp: str):
    resend.api_key = current_app.config["RESEND_API_KEY"]

    params = {
        "from": current_app.config["FROM_EMAIL"],
        "to": [to_email],
        "subject": "ShopIQ Email Verification OTP",
        "html": f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
            <h2>ShopIQ Email Verification</h2>

            <p>Hello,</p>

            <p>Your verification code is:</p>

            <h1 style="letter-spacing:6px;
                       text-align:center;
                       background:#f4f4f4;
                       padding:15px;
                       border-radius:8px;">
                {otp}
            </h1>

            <p>This OTP will expire in <b>2 minutes</b>.</p>

            <p>If you didn't request this verification, you can safely ignore this email.</p>

            <hr>

            <small>
            This is an automated email from ShopIQ.
            Please do not reply.
            </small>
        </div>
        """
    }

    return resend.Emails.send(params)