import os
from flask import Flask, render_template, request, jsonify, send_file, make_response, session, redirect, url_for
from werkzeug.utils import secure_filename
import PyPDF2
from openai import OpenAI
import json
import markdown2
import io
import base64
import tempfile
from markupsafe import Markup
from urllib.parse import unquote
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import stripe
import uuid
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from src.services.supabase_client import supabase

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv('.env')
except:
    # Fallback to .env if .env doesn't exist
    try:
        load_dotenv()
    except:
        pass  # Continue without .env file if there are issues

def create_app():
    app = Flask(__name__)
    app.config['UPLOAD_FOLDER'] = 'uploads/'
    app.config['ALLOWED_EXTENSIONS'] = {'pdf'}
    app.secret_key = os.environ.get('FLASK_SECRET_KEY')
    
    # JWT configuration
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False  # Set to timedelta(hours=1) for production
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'
    app.config['JWT_DECODE_ALGORITHMS'] = ['HS256']

    # Use environment variable for API key
    client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

    # Stripe configuration
    stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

    YOUR_DOMAIN = os.environ.get('APP_URL', 'http://127.0.0.1:5000')

    # --- API Blueprint Registration ---
    from src.api.auth import auth_bp
    from src.api.chat import chat_bp
    from src.api.budget import budget_bp
    from src.api.disputes import disputes_bp
    from src.api.subscription import subscription_bp
    from src.api.ml import ml_bp
    from src.api.crdt import crdt_bp

    CORS(app, supports_credentials=True, expose_headers=["Authorization"], allow_headers=["Authorization", "Content-Type"])
    jwt = JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(budget_bp, url_prefix='/api/budget')
    app.register_blueprint(disputes_bp, url_prefix='/api/disputes')
    app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(crdt_bp, url_prefix='/api/crdt')

    def allowed_file(filename):
        return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

    def extract_text_from_pdf(file_path):
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text()
        return text

    def analyze_credit_report(text):
        response = client.chat.completions.create(
            model="gpt-4o-2024-08-06",
            messages=[
                {"role": "system", "content": (
                    "You are a world-class financial analyst specializing in credit reports. "
                    "Analyze the given credit report and provide a detailed summary. "
                    "In your output, ensure the following: "
                    "1. Give a concise executive summary of the person's credit health and risks. "
                    "2. List at least five highly actionable, personalized steps to improve their credit, referencing specific numbers from the report. "
                    "3. For each negative item or risk, provide a clear explanation and a step-by-step action plan to resolve it (with links to reputable resources if possible). "
                    "4. Provide a 90-day improvement roadmap with monthly milestones. "
                    "5. Offer tailored advice for maximizing approval odds for loans, credit cards, or mortgages, based on their profile. "
                    "6. Include a myth-busting FAQ section about credit scores and reports. "
                    "7. Make the advice practical, detailed, and worth at least $99—do not be generic. "
                    "8. Use clear, confident, and encouraging language."
                )},
                {"role": "user", "content": f"Analyze the following credit report:\n\n{text}"}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "credit_report_analysis",
                    "strict": True,
                    "schema": {
                        "type": "object",
                        "properties": {
                            "credit_score": {"type": "integer"},
                            "credit_utilization": {"type": "number"},
                            "payment_history": {
                                "type": "object",
                                "properties": {
                                    "on_time": {"type": "integer"},
                                    "late": {"type": "integer"}
                                },
                                "required": ["on_time", "late"],
                                "additionalProperties": False
                            },
                            "avg_account_age": {"type": "number"},
                            "account_types": {
                                "type": "object",
                                "additionalProperties": {"type": "integer"}
                            },
                            "negative_items": {"type": "integer"},
                            "detailed_analysis": {"type": "string"},
                            "improvement_advice": {"type": "string"},
                            "action_steps": {"type": "array", "items": {"type": "string"}},
                            "negative_item_plans": {"type": "array", "items": {"type": "string"}},
                            "roadmap_90_days": {"type": "array", "items": {"type": "string"}},
                            "approval_advice": {"type": "string"},
                            "faq": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": [
                            "credit_score", "credit_utilization", "payment_history", "avg_account_age", "negative_items", "detailed_analysis", "improvement_advice", "action_steps", "negative_item_plans", "roadmap_90_days", "approval_advice", "faq"
                        ],
                        "additionalProperties": False
                    }
                }
            }
        )
        return json.loads(response.choices[0].message.content)

    def generate_charts(data):
        # Import matplotlib only when needed
        try:
            import matplotlib
            matplotlib.use('Agg')  # Set the backend to Agg before importing pyplot
            import matplotlib.pyplot as plt
            
            charts = {}
            
            # Credit Score Chart
            plt.figure(figsize=(8, 4))
            plt.bar(['Credit Score'], [data['credit_score']])
            plt.title('Credit Score')
            plt.ylim(300, 850)
            charts['credit_score'] = get_chart_image()
            plt.close()

            # Credit Utilization Chart
            plt.figure(figsize=(8, 4))
            plt.bar(['Credit Utilization'], [data['credit_utilization']])
            plt.title('Credit Utilization (%)')
            plt.ylim(0, 100)
            charts['credit_utilization'] = get_chart_image()
            plt.close()

            # Payment History Chart
            plt.figure(figsize=(8, 4))
            payment_data = data['payment_history']
            on_time = payment_data.get('on_time', 0)
            late = payment_data.get('late', 0)
            # Avoid pie chart crash if both are zero or NaN
            try:
                on_time = int(on_time) if on_time is not None and not (isinstance(on_time, float) and (on_time != on_time)) else 0
                late = int(late) if late is not None and not (isinstance(late, float) and (late != late)) else 0
            except Exception:
                on_time, late = 0, 0
            if (on_time + late) > 0:
                plt.pie([on_time, late], labels=['On Time', 'Late'], autopct='%1.1f%%')
                plt.title('Payment History')
            else:
                plt.text(0.5, 0.5, 'No payment data available', ha='center', va='center', transform=plt.gca().transAxes)
                plt.title('Payment History')
            charts['payment_history'] = get_chart_image()
            plt.close()

            return charts
        except ImportError as e:
            print(f"Warning: matplotlib not available: {e}")
            return {}

    def get_chart_image():
        import matplotlib.pyplot as plt
        img = io.BytesIO()
        plt.savefig(img, format='png', bbox_inches='tight')
        img.seek(0)
        return base64.b64encode(img.getvalue()).decode()

    @app.route('/', methods=['GET'])
    def index():
        return jsonify({"message": "GritScore API is running!", "status": "healthy"})

    @app.route('/upload', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            # Extract text from PDF
            text = extract_text_from_pdf(file_path)
            
            # Analyze the credit report
            analysis = analyze_credit_report(text)
            
            # Generate charts
            charts = generate_charts(analysis)
            
            return jsonify({
                'analysis': analysis,
                'charts': charts,
                'filename': filename
            })
        return jsonify({'error': 'Invalid file type'}), 400

    @app.route('/analysis', methods=['GET'])
    def analysis_page():
        # Redirect to React frontend or return a message
        return jsonify({"message": "Analysis endpoint - use POST /upload to analyze credit reports"})

    @app.route('/download', methods=['POST'])
    def download_pdf():
        try:
            data = request.get_json()
            if not data or 'analysis' not in data:
                return jsonify({'error': 'No analysis data provided'}), 400

            analysis = data['analysis']
            
            # Create PDF
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            story = []
            
            # Styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            
            # Title
            story.append(Paragraph("Credit Report Analysis", title_style))
            story.append(Spacer(1, 20))
            
            # Executive Summary
            story.append(Paragraph("Executive Summary", styles['Heading2']))
            story.append(Paragraph(analysis.get('detailed_analysis', 'No analysis available.'), styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Credit Score
            story.append(Paragraph(f"Credit Score: {analysis.get('credit_score', 'N/A')}", styles['Heading3']))
            story.append(Spacer(1, 10))
            
            # Action Steps
            story.append(Paragraph("Action Steps", styles['Heading2']))
            for i, step in enumerate(analysis.get('action_steps', []), 1):
                story.append(Paragraph(f"{i}. {step}", styles['Normal']))
            story.append(Spacer(1, 20))
            
            # 90-Day Roadmap
            story.append(Paragraph("90-Day Improvement Roadmap", styles['Heading2']))
            for i, milestone in enumerate(analysis.get('roadmap_90_days', []), 1):
                story.append(Paragraph(f"Month {i}: {milestone}", styles['Normal']))
            story.append(Spacer(1, 20))
            
            # FAQ
            story.append(Paragraph("Frequently Asked Questions", styles['Heading2']))
            for qa in analysis.get('faq', []):
                story.append(Paragraph(qa, styles['Normal']))
                story.append(Spacer(1, 10))
            
            # Build PDF
            doc.build(story)
            buffer.seek(0)
            
            response = make_response(buffer.getvalue())
            response.headers['Content-Type'] = 'application/pdf'
            response.headers['Content-Disposition'] = 'attachment; filename=credit_analysis.pdf'
            
            return response
            
        except Exception as e:
            return jsonify({'error': f'Error generating PDF: {str(e)}'}), 500

    @app.route('/create-checkout-session', methods=['POST'])
    def create_checkout_session():
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'Credit Report Analysis',
                        },
                        'unit_amount': 9900,  # $99.00 in cents
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=YOUR_DOMAIN + '/success',
                cancel_url=YOUR_DOMAIN + '/',
            )
            return jsonify({'id': checkout_session.id})
        except Exception as e:
            return jsonify({'error': str(e)}), 403

    @app.route('/success')
    def payment_success():
        # After payment, redirect to analysis
        return jsonify({"message": "Payment successful! You can now analyze credit reports."})

    @app.route('/test-supabase')
    def test_supabase():
        try:
            # Test Supabase connection
            response = supabase.table('users').select('*').limit(1).execute()
            return jsonify({"message": "Supabase connection successful", "data": response.data})
        except Exception as e:
            return jsonify({"error": f"Supabase connection failed: {str(e)}"}), 500

    # JWT error handlers
    @jwt.unauthorized_loader
    def custom_unauthorized_response(callback):
        return jsonify({"error": "Missing Authorization header"}), 401

    @jwt.invalid_token_loader
    def custom_invalid_token_response(callback):
        return jsonify({"error": "Invalid token"}), 401

    @jwt.expired_token_loader
    def custom_expired_token_response(jwt_header, jwt_payload):
        return jsonify({"error": "Token has expired"}), 401

    @jwt.revoked_token_loader
    def custom_revoked_token_response(jwt_header, jwt_payload):
        return jsonify({"error": "Token has been revoked"}), 401

    return app 