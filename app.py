import matplotlib
matplotlib.use('Agg')  # Set the backend to Agg before importing pyplot

from flask import Flask, render_template, request, jsonify, send_file, make_response, session, redirect, url_for
from werkzeug.utils import secure_filename
import os
import PyPDF2
from openai import OpenAI
import json
import markdown2
import matplotlib.pyplot as plt
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
# from flask_socketio import SocketIO, emit
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

    YOUR_DOMAIN = os.environ.get('APP_URL', 'https://gritscore.vercel.app')

    # --- API Blueprint Registration ---
    from src.api.auth import auth_bp
    from src.api.chat import chat_bp
    from src.api.budget import budget_bp
    from src.api.disputes import disputes_bp
    from src.api.subscription import subscription_bp
    from src.api.ml import ml_bp
    from src.api.crdt import crdt_bp

    CORS(app, origins=[
        "https://gritscore.vercel.app",
        "https://www.gritscore.vercel.app",
        "http://localhost:5173"
    ], supports_credentials=True, expose_headers=["Authorization"], allow_headers=["Authorization", "Content-Type"])
    jwt = JWTManager(app)

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(chat_bp, url_prefix='/api/chat')
    app.register_blueprint(budget_bp, url_prefix='/api/budget')
    app.register_blueprint(disputes_bp, url_prefix='/api/disputes')
    app.register_blueprint(subscription_bp, url_prefix='/api/subscription')
    app.register_blueprint(ml_bp, url_prefix='/api/ml')
    app.register_blueprint(crdt_bp, url_prefix='/api/crdt')

    # Comment out SocketIO for now since we don't need WebSocket functionality
    # socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

    # Example event for testing
    # @socketio.on('connect')
    # def handle_connect():
    #     emit('server_message', {'data': 'Connected to GritScore.ai real-time server'})

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
        else:
            plt.pie([1], labels=['No Data'], colors=['#E5E7EB'])
        plt.title('Payment History')
        charts['payment_history'] = get_chart_image()
        plt.close()

        # Account Types Chart (if available)
        if 'account_types' in data and data['account_types']:
            plt.figure(figsize=(8, 6))
            account_types = data['account_types']
            plt.pie(account_types.values(), labels=account_types.keys(), autopct='%1.1f%%')
            plt.title('Account Types')
            charts['account_types'] = get_chart_image()
            plt.close()

        return charts

    def get_chart_image():
        img = io.BytesIO()
        plt.savefig(img, format='png')
        img.seek(0)
        return base64.b64encode(img.getvalue()).decode()



    @app.route('/', methods=['GET'])
    def index():
        return render_template('upload.html')

    @app.route('/upload', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'})
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'})
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            # Generate a unique analysis ID and store in session
            analysis_id = str(uuid.uuid4())
            session['analysis_id'] = analysis_id
            session['filename'] = filename
            return jsonify({'success': True})
        return jsonify({'error': 'Invalid file'})

    @app.route('/analysis', methods=['GET'])
    def analysis_page():
        # Redirect to React frontend or return a message
        return "This endpoint is now handled by the frontend. Please use the app interface.", 410

    @app.route('/download', methods=['POST'])
    def download_pdf():
        import tempfile
        import base64
        analysis_id = session.get('analysis_id')
        if not analysis_id:
            return redirect(url_for('index'))
        user_data_dir = os.path.join('user_data', analysis_id)
        analysis_json_path = os.path.join(user_data_dir, 'analysis.json')
        charts_json_path = os.path.join(user_data_dir, 'charts.json')
        if not (os.path.exists(analysis_json_path) and os.path.exists(charts_json_path)):
            filename = session.get('filename')
            if not filename:
                return redirect(url_for('index'))
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            if not os.path.exists(file_path):
                return redirect(url_for('index'))
            text = extract_text_from_pdf(file_path)
            result = analyze_credit_report(text)
            charts = generate_charts(result)
            os.makedirs(user_data_dir, exist_ok=True)
            with open(analysis_json_path, 'w') as f:
                json.dump(result, f)
            with open(charts_json_path, 'w') as f:
                json.dump(charts, f)
        else:
            with open(analysis_json_path, 'r') as f:
                result = json.load(f)
            with open(charts_json_path, 'r') as f:
                charts = json.load(f)
        # Create PDF using ReportLab
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_pdf:
            doc = SimpleDocTemplate(tmp_pdf.name, pagesize=A4)
            styles = getSampleStyleSheet()
            story = []
            
            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=24,
                spaceAfter=30,
                alignment=1  # Center alignment
            )
            story.append(Paragraph("Credit Analysis Report", title_style))
            story.append(Spacer(1, 20))
            
            # Credit Score Summary
            story.append(Paragraph(f"<b>Credit Score:</b> {result['credit_score']}", styles['Normal']))
            story.append(Paragraph(f"<b>Credit Utilization:</b> {result['credit_utilization']:.1f}%", styles['Normal']))
            story.append(Paragraph(f"<b>Average Account Age:</b> {result['avg_account_age']:.1f} years", styles['Normal']))
            story.append(Paragraph(f"<b>Negative Items:</b> {result['negative_items']}", styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Detailed Analysis
            story.append(Paragraph("<b>Detailed Analysis:</b>", styles['Heading2']))
            story.append(Paragraph(result['detailed_analysis'], styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Improvement Advice
            story.append(Paragraph("<b>Improvement Advice:</b>", styles['Heading2']))
            story.append(Paragraph(result['improvement_advice'], styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Action Steps
            story.append(Paragraph("<b>Action Steps:</b>", styles['Heading2']))
            for i, step in enumerate(result['action_steps'], 1):
                story.append(Paragraph(f"{i}. {step}", styles['Normal']))
            story.append(Spacer(1, 20))
            
            # 90-Day Roadmap
            story.append(Paragraph("<b>90-Day Improvement Roadmap:</b>", styles['Heading2']))
            for i, milestone in enumerate(result['roadmap_90_days'], 1):
                story.append(Paragraph(f"Month {i}: {milestone}", styles['Normal']))
            story.append(Spacer(1, 20))
            
            # Approval Advice
            story.append(Paragraph("<b>Approval Advice:</b>", styles['Heading2']))
            story.append(Paragraph(result['approval_advice'], styles['Normal']))
            story.append(Spacer(1, 20))
            
            # FAQ
            story.append(Paragraph("<b>Frequently Asked Questions:</b>", styles['Heading2']))
            for faq in result['faq']:
                story.append(Paragraph(f"• {faq}", styles['Normal']))
            
            doc.build(story)
            
            response = send_file(tmp_pdf.name, as_attachment=True, download_name='credit_analysis.pdf')
            return response

    @app.route('/create-checkout-session', methods=['POST'])
    def create_checkout_session():
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'unit_amount': 9900,
                    'product_data': {
                        'name': 'Premium Credit Analysis PDF',
                        'description': 'Personalized, actionable credit analysis and PDF report.'
                    },
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=YOUR_DOMAIN + '/success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=YOUR_DOMAIN + '/',
        )
        return jsonify({'id': checkout_session.id})

    @app.route('/success')
    def payment_success():
        # After payment, redirect to analysis
        return redirect(url_for('analysis_page'))

    @app.route('/test-supabase')
    def test_supabase():
        try:
            # Using 'users' as a sample table name; replace with your actual table if needed
            # Note: This endpoint uses the base client for testing purposes
            response = supabase.table('users').select('*').limit(1).execute()
            return jsonify({'success': True, 'data': response.data})
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)})

    @jwt.unauthorized_loader
    def custom_unauthorized_response(callback):
        print("[JWT DEBUG] Unauthorized: No JWT in request or invalid header")
        return jsonify({"msg": "Missing or invalid JWT"}), 401

    @jwt.invalid_token_loader
    def custom_invalid_token_response(callback):
        print("[JWT DEBUG] Invalid token:", callback)
        return jsonify({"msg": "Invalid JWT"}), 401

    @jwt.expired_token_loader
    def custom_expired_token_response(jwt_header, jwt_payload):
        print("[JWT DEBUG] Expired token")
        return jsonify({"msg": "Expired JWT"}), 401

    @jwt.revoked_token_loader
    def custom_revoked_token_response(jwt_header, jwt_payload):
        print("[JWT DEBUG] Revoked token")
        return jsonify({"msg": "Revoked JWT"}), 401

    # After all blueprints are registered, before app.run()
    print("Registered endpoints:")
    for rule in app.url_map.iter_rules():
        print(rule, rule.endpoint)

    return app

# For CLI and WSGI
app = create_app()

if __name__ == "__main__":
    import sys
    port = int(os.environ.get("PORT", 5000))
    # Allow port override from command line
    if len(sys.argv) > 1 and sys.argv[1] == '--port' and len(sys.argv) > 2:
        port = int(sys.argv[2])
    app.run(host="0.0.0.0", port=port, debug=True)