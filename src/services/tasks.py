from celery_worker import celery
from src.services.email_service import EmailService

@celery.task
def send_email_task(to_email, subject, html_content, text_content=None):
    email_service = EmailService()
    return email_service.send_email(to_email, subject, html_content, text_content) 