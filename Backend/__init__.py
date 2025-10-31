import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
import logging
from config import Config

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.mail_server = Config.MAIL_SERVER
        self.mail_port = Config.MAIL_PORT
        self.mail_username = Config.MAIL_USERNAME
        self.mail_password = Config.MAIL_PASSWORD
        self.mail_use_tls = Config.MAIL_USE_TLS
    
    def send_order_confirmation(self, order_data, customer_email):
        """Send order confirmation email via Gmail"""
        try:
            # Create message
            msg = MimeMultipart()
            msg['From'] = self.mail_username
            msg['To'] = customer_email
            msg['Subject'] = f"Order Confirmation - #{order_data.get('order_id', 'N/A')}"
            
            # Create email body
            html_content = self._create_order_email_template(order_data)
            msg.attach(MimeText(html_content, 'html'))
            
            # Send email
            with smtplib.SMTP(self.mail_server, self.mail_port) as server:
                if self.mail_use_tls:
                    server.starttls()
                server.login(self.mail_username, self.mail_password)
                server.send_message(msg)
            
            logger.info(f"Order confirmation sent to {customer_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send order confirmation: {str(e)}")
            return False
    
    def send_payment_receipt(self, payment_data, customer_email):
        """Send payment receipt email"""
        try:
            msg = MimeMultipart()
            msg['From'] = self.mail_username
            msg['To'] = customer_email
            msg['Subject'] = f"Payment Receipt - #{payment_data.get('payment_id', 'N/A')}"
            
            html_content = self._create_payment_email_template(payment_data)
            msg.attach(MimeText(html_content, 'html'))
            
            with smtplib.SMTP(self.mail_server, self.mail_port) as server:
                if self.mail_use_tls:
                    server.starttls()
                server.login(self.mail_username, self.mail_password)
                server.send_message(msg)
            
            logger.info(f"Payment receipt sent to {customer_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send payment receipt: {str(e)}")
            return False
    
    def _create_order_email_template(self, order_data):
        """Create HTML email template for order confirmation"""
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; }}
                .header {{ background: #f8f9fa; padding: 20px; text-align: center; }}
                .order-details {{ margin: 20px 0; }}
                .footer {{ margin-top: 20px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Order Confirmation</h1>
                </div>
                <p>Thank you for your order! Here are your order details:</p>
                <div class="order-details">
                    <h3>Order #{order_data.get('order_id', 'N/A')}</h3>
                    <p><strong>Amount:</strong> ₹{order_data.get('amount', 0):.2f}</p>
                    <p><strong>Status:</strong> {order_data.get('status', 'Pending')}</p>
                </div>
                <div class="footer">
                    <p>If you have any questions, please contact our support team.</p>
                </div>
            </div>
        </body>
        </html>
        """
    
    def _create_payment_email_template(self, payment_data):
        """Create HTML email template for payment receipt"""
        return f"""
        <!DOCTYPE html>
        <html>
        <body>
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #f8f9fa; padding: 20px; text-align: center;">
                    <h1>Payment Receipt</h1>
                </div>
                <p>Thank you for your payment! Here are your payment details:</p>
                <div style="margin: 20px 0;">
                    <h3>Payment #{payment_data.get('payment_id', 'N/A')}</h3>
                    <p><strong>Amount:</strong> ₹{payment_data.get('amount', 0):.2f}</p>
                    <p><strong>Order ID:</strong> {payment_data.get('order_id', 'N/A')}</p>
                    <p><strong>Date:</strong> {payment_data.get('payment_date', 'N/A')}</p>
                </div>
            </div>
        </body>
        </html>
        """