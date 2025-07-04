import os
from mailjet_rest import Client
from flask import render_template_string
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = os.environ.get('MAILJET_API_KEY')
        self.api_secret = os.environ.get('MAILJET_API_SECRET')
        self.sender_email = os.environ.get('MAILJET_SENDER_EMAIL', 'noreply@gritscore.ai')
        self.sender_name = os.environ.get('MAILJET_SENDER_NAME', 'GritScore.ai')
        
        if self.api_key and self.api_secret:
            self.client = Client(auth=(self.api_key, self.api_secret), version='v3.1')
            self.enabled = True
        else:
            logger.warning("Mailjet credentials not found. Email notifications disabled.")
            self.enabled = False
            self.client = None

    def send_email(self, to_email, subject, html_content, text_content=None):
        """Send email using Mailjet"""
        if not self.enabled:
            logger.warning(f"Email service disabled. Would send to {to_email}: {subject}")
            # For development, simulate successful email sending
            logger.info(f"DEVELOPMENT MODE: Email would be sent to {to_email}")
            return True

        try:
            data = {
                'Messages': [
                    {
                        'From': {
                            'Email': self.sender_email,
                            'Name': self.sender_name
                        },
                        'To': [
                            {
                                'Email': to_email
                            }
                        ],
                        'Subject': subject,
                        'HTMLPart': html_content,
                        'TextPart': text_content or self._strip_html(html_content)
                    }
                ]
            }

            response = self.client.send.create(data=data)
            
            if response.status_code == 200:
                logger.info(f"Email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Failed to send email to {to_email}: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"Error sending email to {to_email}: {str(e)}")
            return False

    def _strip_html(self, html_content):
        """Strip HTML tags for text version"""
        import re
        clean = re.compile('<.*?>')
        return re.sub(clean, '', html_content)

    def send_welcome_email(self, user_email, user_name):
        """Send welcome email to new users"""
        subject = "Welcome to GritScore.ai - Your Credit Journey Starts Here!"
        
        html_content = self._get_welcome_template(user_name)
        
        return self.send_email(user_email, subject, html_content)

    def send_crdt_score_update(self, user_email, user_name, old_score, new_score, change):
        """Send credit score update notification"""
        subject = f"Your Credit Score Update: {new_score} ({change:+d} points)"
        
        html_content = self._get_crdt_score_template(user_name, old_score, new_score, change)
        
        return self.send_email(user_email, subject, html_content)

    def send_dispute_update(self, user_email, user_name, dispute_id, status, bureau):
        """Send dispute status update"""
        subject = f"Dispute Update: {status.title()} - {bureau}"
        
        html_content = self._get_dispute_update_template(user_name, dispute_id, status, bureau)
        
        return self.send_email(user_email, subject, html_content)

    def send_payment_confirmation(self, user_email, user_name, amount, plan):
        """Send payment confirmation"""
        subject = f"Payment Confirmed - {plan} Plan"
        
        html_content = self._get_payment_template(user_name, amount, plan)
        
        return self.send_email(user_email, subject, html_content)

    def send_monthly_report(self, user_email, user_name, report_data):
        """Send monthly credit report"""
        subject = "Your Monthly Credit Report - GritScore.ai"
        
        html_content = self._get_monthly_report_template(user_name, report_data)
        
        return self.send_email(user_email, subject, html_content)

    def send_security_alert(self, user_email, user_name, alert_type, details):
        """Send security alert"""
        subject = f"Security Alert: {alert_type}"
        
        html_content = self._get_security_alert_template(user_name, alert_type, details)
        
        return self.send_email(user_email, subject, html_content)

    def send_verification_email(self, user_email, user_name, verification_link):
        """Send email verification email"""
        subject = "Verify Your GritScore.ai Account"
        
        html_content = self._get_verification_template(user_name, verification_link)
        
        return self.send_email(user_email, subject, html_content)

    def send_password_reset(self, user_email, user_name, reset_link):
        """Send password reset email"""
        subject = "Reset Your GritScore.ai Password"
        
        html_content = self._get_password_reset_template(user_name, reset_link)
        
        return self.send_email(user_email, subject, html_content)

    # Email Templates
    def _get_welcome_template(self, user_name):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to GritScore.ai</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .feature {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚀 Welcome to GritScore.ai!</h1>
                    <p>Your AI-powered credit improvement journey starts now</p>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>Welcome to GritScore.ai! We're excited to help you take control of your credit and financial future.</p>
                    
                    <h3>What you can do with GritScore.ai:</h3>
                    <div class="feature">
                        <strong>📊 AI Credit Analysis</strong><br>
                        Get detailed insights into your credit report with our advanced AI analysis
                    </div>
                    <div class="feature">
                        <strong>🤖 AI Financial Coach</strong><br>
                        Chat with our AI coach for personalized financial advice
                    </div>
                    <div class="feature">
                        <strong>📝 Dispute Automation</strong><br>
                        Automatically generate and track credit dispute letters
                    </div>
                    <div class="feature">
                        <strong>💰 Budget Planning</strong><br>
                        Plan and track your spending with AI-powered insights
                    </div>
                    
                    <a href="http://localhost:3000/app" class="button">Get Started</a>
                    
                    <p>If you have any questions, our support team is here to help!</p>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_crdt_score_template(self, user_name, old_score, new_score, change):
        change_text = f"+{change}" if change > 0 else str(change)
        change_color = "#22c55e" if change > 0 else "#ef4444" if change < 0 else "#6b7280"
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Credit Score Update</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .score-card {{ background: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .new-score {{ font-size: 48px; font-weight: bold; color: #667eea; }}
                .change {{ font-size: 24px; font-weight: bold; color: {change_color}; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📈 Your Credit Score Update</h1>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>Your credit score has been updated!</p>
                    
                    <div class="score-card">
                        <div class="new-score">{new_score}</div>
                        <div class="change">{change_text} points</div>
                        <p>Previous score: {old_score}</p>
                    </div>
                    
                    <p>Keep up the great work! Continue monitoring your credit and following our AI recommendations to improve your score further.</p>
                    
                    <a href="http://localhost:3000/app/analysis" class="button">View Full Analysis</a>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_dispute_update_template(self, user_name, dispute_id, status, bureau):
        status_colors = {
            'pending': '#f59e0b',
            'in_progress': '#3b82f6',
            'resolved': '#22c55e',
            'rejected': '#ef4444'
        }
        
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Dispute Update</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .status-badge {{ display: inline-block; background: {status_colors.get(status, '#6b7280')}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📝 Dispute Update</h1>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>Your credit dispute has been updated:</p>
                    
                    <p><strong>Dispute ID:</strong> {dispute_id}</p>
                    <p><strong>Bureau:</strong> {bureau}</p>
                    <p><strong>Status:</strong> <span class="status-badge">{status.replace('_', ' ').title()}</span></p>
                    
                    <a href="http://localhost:3000/app/disputes" class="button">View Dispute Details</a>
                    
                    <p>We'll keep you updated on any further changes to your dispute.</p>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_payment_template(self, user_name, amount, plan):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Payment Confirmation</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .payment-card {{ background: white; padding: 20px; margin: 20px 0; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
                .amount {{ font-size: 36px; font-weight: bold; color: #667eea; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Payment Confirmed</h1>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>Thank you for your payment!</p>
                    
                    <div class="payment-card">
                        <div class="amount">${amount}</div>
                        <p><strong>{plan} Plan</strong></p>
                        <p>Your subscription is now active</p>
                    </div>
                    
                    <p>You now have access to all premium features including advanced AI analysis, dispute automation, and priority support.</p>
                    
                    <a href="http://localhost:3000/app" class="button">Access Dashboard</a>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_monthly_report_template(self, user_name, report_data):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Monthly Credit Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .metric {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Your Monthly Credit Report</h1>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>Here's your monthly credit report summary:</p>
                    
                    <div class="metric">
                        <strong>Current Credit Score:</strong> {report_data.get('score', 'N/A')}
                    </div>
                    <div class="metric">
                        <strong>Score Change:</strong> {report_data.get('change', 'N/A')} points
                    </div>
                    <div class="metric">
                        <strong>Active Disputes:</strong> {report_data.get('disputes', 'N/A')}
                    </div>
                    <div class="metric">
                        <strong>AI Recommendations:</strong> {report_data.get('recommendations', 'N/A')} new suggestions
                    </div>
                    
                    <a href="http://localhost:3000/app/analysis" class="button">View Full Report</a>
                    
                    <p>Keep up the great work on improving your credit!</p>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_security_alert_template(self, user_name, alert_type, details):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Security Alert</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .alert-box {{ background: #fef2f2; border: 1px solid #fecaca; padding: 20px; border-radius: 5px; margin: 20px 0; }}
                .button {{ display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🚨 Security Alert</h1>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    
                    <div class="alert-box">
                        <h3>Alert Type: {alert_type}</h3>
                        <p>{details}</p>
                    </div>
                    
                    <p>If this wasn't you, please secure your account immediately.</p>
                    
                    <a href="http://localhost:3000/app/profile" class="button">Secure Account</a>
                    
                    <p>Best regards,<br>The GritScore.ai Security Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_verification_template(self, user_name, verification_link):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verify Your Account</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
                .feature {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✅ Verify Your Account</h1>
                    <p>Welcome to GritScore.ai!</p>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>Thank you for registering with GritScore.ai! To complete your registration and start using our AI-powered credit analysis platform, please verify your email address.</p>
                    
                    <a href="{verification_link}" class="button">Verify Email Address</a>
                    
                    <p>Once verified, you'll have access to:</p>
                    <div class="feature">
                        <strong>📊 AI Credit Analysis</strong><br>
                        Get detailed insights into your credit report
                    </div>
                    <div class="feature">
                        <strong>🤖 AI Financial Coach</strong><br>
                        Chat with our AI coach for personalized advice
                    </div>
                    <div class="feature">
                        <strong>📝 Dispute Automation</strong><br>
                        Automatically generate and track credit disputes
                    </div>
                    
                    <p>If you didn't create an account with GritScore.ai, you can safely ignore this email.</p>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

    def _get_password_reset_template(self, user_name, reset_link):
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Reset Your Password</title>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🔐 Reset Your Password</h1>
                </div>
                <div class="content">
                    <h2>Hi {user_name},</h2>
                    <p>We received a request to reset your password for your GritScore.ai account.</p>
                    
                    <a href="{reset_link}" class="button">Reset Password</a>
                    
                    <p>This link will expire in 1 hour for security reasons.</p>
                    <p>If you didn't request this password reset, please ignore this email.</p>
                    
                    <p>Best regards,<br>The GritScore.ai Team</p>
                </div>
            </div>
        </body>
        </html>
        """

# Global email service instance
email_service = EmailService() 