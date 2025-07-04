from flask import Blueprint, request, jsonify, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from openai import OpenAI
import os
import json
import base64
from datetime import datetime
import uuid
from .chat import get_user_financial_context
from .subscription import premium_required, vip_required
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import cv2
import numpy as np
import re
import tempfile
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

crdt_bp = Blueprint('crdt', __name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

def preprocess_image_for_ocr(image_path):
    """Preprocess image to improve OCR accuracy"""
    try:
        # Read image with OpenCV
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        # Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (1, 1), 0)
        
        # Apply thresholding to get binary image
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Apply morphological operations to clean up the image
        kernel = np.ones((1, 1), np.uint8)
        cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
        
        # Convert back to PIL Image for pytesseract
        pil_image = Image.fromarray(cleaned)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(pil_image)
        enhanced = enhancer.enhance(2.0)
        
        # Enhance sharpness
        sharpened = enhanced.filter(ImageFilter.SHARPEN)
        
        return sharpened
    except Exception as e:
        print(f"Image preprocessing error: {e}")
        # Fallback to original image
        return Image.open(image_path)

def calculate_derived_metrics(data):
    """Calculate derived metrics from extracted data"""
    try:
        # Ensure all required nested dictionaries exist
        if 'credit_utilization' not in data:
            data['credit_utilization'] = {}
        if 'utilization_details' not in data:
            data['utilization_details'] = {}
        if 'account_summary' not in data:
            data['account_summary'] = {}
        if 'payment_history' not in data:
            data['payment_history'] = {}
        if 'new_credit' not in data:
            data['new_credit'] = {}
        if 'derogatory_marks' not in data:
            data['derogatory_marks'] = {}
        
        # Calculate utilization ratios for accounts
        if data.get('accounts'):
            total_balance = 0
            total_limit = 0
            credit_card_balance = 0
            credit_card_limit = 0
            
            for account in data['accounts']:
                # Ensure account has required fields
                if 'balance' not in account:
                    account['balance'] = 0
                if 'credit_limit' not in account:
                    account['credit_limit'] = 0
                
                balance = account.get('balance', 0) or 0
                limit = account.get('credit_limit', 0) or 0
                
                # Convert to numbers if they're strings
                try:
                    balance = float(balance) if balance is not None else 0
                    limit = float(limit) if limit is not None else 0
                except (ValueError, TypeError):
                    balance = 0
                    limit = 0
                
                total_balance += balance
                total_limit += limit
                
                if account.get('type') == 'credit_card':
                    credit_card_balance += balance
                    credit_card_limit += limit
                
                # Calculate individual account utilization
                if limit > 0:
                    account['utilization'] = round((balance / limit) * 100, 1)
                else:
                    account['utilization'] = 0
            
            # Calculate overall utilization
            if total_limit > 0:
                data['credit_utilization']['overall_utilization_ratio'] = round((total_balance / total_limit) * 100, 1)
                data['credit_utilization']['total_outstanding_debt'] = total_balance
                data['credit_utilization']['total_credit_limits'] = total_limit
            else:
                data['credit_utilization']['overall_utilization_ratio'] = 0
                data['credit_utilization']['total_outstanding_debt'] = 0
                data['credit_utilization']['total_credit_limits'] = 0
            
            # Calculate credit card utilization
            if credit_card_limit > 0:
                data['utilization_details']['credit_cards_utilization'] = round((credit_card_balance / credit_card_limit) * 100, 1)
            else:
                data['utilization_details']['credit_cards_utilization'] = 0
        
        # Calculate account summary
        if data.get('accounts'):
            total_accounts = len(data['accounts'])
            open_accounts = sum(1 for acc in data['accounts'] if acc.get('status') == 'open')
            accounts_with_balances = sum(1 for acc in data['accounts'] if (acc.get('balance', 0) or 0) > 0)
            
            data['account_summary']['total_accounts'] = total_accounts
            data['account_summary']['open_accounts'] = open_accounts
            data['account_summary']['accounts_with_balances'] = accounts_with_balances
        else:
            data['account_summary']['total_accounts'] = 0
            data['account_summary']['open_accounts'] = 0
            data['account_summary']['accounts_with_balances'] = 0
        
        # Calculate credit mix
        if data.get('accounts'):
            credit_mix = {
                'revolving_accounts': 0,
                'installment_accounts': 0,
                'mortgage_accounts': 0,
                'auto_loan_accounts': 0,
                'student_loan_accounts': 0,
                'retail_accounts': 0,
                'other_accounts': 0
            }
            
            for account in data['accounts']:
                acc_type = account.get('type', 'other')
                if acc_type == 'credit_card':
                    credit_mix['revolving_accounts'] += 1
                elif acc_type == 'auto_loan':
                    credit_mix['auto_loan_accounts'] += 1
                elif acc_type == 'mortgage':
                    credit_mix['mortgage_accounts'] += 1
                elif acc_type == 'student_loan':
                    credit_mix['student_loan_accounts'] += 1
                else:
                    credit_mix['other_accounts'] += 1
            
            data['credit_mix'] = credit_mix
        else:
            data['credit_mix'] = {
                'revolving_accounts': 0,
                'installment_accounts': 0,
                'mortgage_accounts': 0,
                'auto_loan_accounts': 0,
                'student_loan_accounts': 0,
                'retail_accounts': 0,
                'other_accounts': 0
            }
        
        # Calculate risk factors
        risk_factors = {
            'high_utilization': False,
            'recent_late_payments': False,
            'multiple_inquiries': False,
            'short_credit_history': False,
            'limited_credit_mix': False,
            'derogatory_items': False
        }
        
        # Check for high utilization (>30%)
        utilization = data.get('credit_utilization', {}).get('overall_utilization_ratio', 0)
        if utilization and utilization > 30:
            risk_factors['high_utilization'] = True
        
        # Check for recent late payments
        late_payments = data.get('payment_history', {}).get('total_late_payments', 0)
        if late_payments and late_payments > 0:
            risk_factors['recent_late_payments'] = True
        
        # Check for multiple inquiries
        inquiries = data.get('new_credit', {}).get('recent_inquiries_12_months', 0)
        if inquiries and inquiries > 2:
            risk_factors['multiple_inquiries'] = True
        
        # Check for derogatory items
        derogatory = data.get('derogatory_marks', {}).get('total_derogatory_items', 0)
        if derogatory and derogatory > 0:
            risk_factors['derogatory_items'] = True
        
        data['risk_factors'] = risk_factors
        
        return data
    except Exception as e:
        print(f"Error calculating derived metrics: {e}")
        return data

# --- AI Analysis Helper ---
def analyze_crdt_report_with_ai(crdt_data, user_financial_context):
    try:
        # Simplify the data to avoid token limits
        simplified_data = {
            "credit_score": crdt_data.get("personal_info", {}).get("credit_score", 0),
            "accounts": crdt_data.get("accounts", [])[:5],  # Limit to first 5 accounts
            "payment_history": crdt_data.get("payment_history", {}),
            "credit_utilization": crdt_data.get("credit_utilization", {}),
            "derogatory_marks": crdt_data.get("derogatory_marks", {})
        }
        
        system_prompt = f"""
You are a highly experienced credit analyst AI. Carefully review the provided credit data and generate a comprehensive, **professional JSON report**.

The report must be practical, deep, and explain both strengths and weaknesses. Base your findings on FICO scoring logic, best industry practices, and recent trends.

**For each FICO factor (payment history, credit utilization, credit history length, new credit, credit mix):**
- Provide a detailed explanation of how this factor impacts the user's score, with real-world examples.
- Give a step-by-step, actionable plan for improving this factor, tailored to the user's data.
- Explain the rationale behind each recommendation, including how much it could impact the score and why.
- If the factor is already strong, explain how to maintain it and what pitfalls to avoid.

**For the overall improvement plan:**
- Give a prioritized, step-by-step action plan with specific, practical steps (not just general advice).
- For each negative item, provide a recommended action (e.g., dispute, negotiate, wait for fall-off) and explain why.
- Include a 90-day roadmap with monthly goals and what to expect.
- Include a section on common credit myths and facts, with clear, factual answers.
- Make the language educational and easy to understand, but professional.

Credit Data (JSON):
{json.dumps(simplified_data, indent=2)}

**Respond with ONLY valid JSON in the EXACT format below. Do NOT add any extra text or commentary.**

{{
  "credit_score": 0,                  // INT: The calculated or reported credit score (e.g. 712)
  "score_rating": "Good",             // STRING: Excellent, Good, Fair, Poor, Very Poor
  "credit_utilization": 0.0,          // FLOAT: % utilization (e.g. 23.8)
  "payment_history": {{
    "on_time": 0,                     // INT: Total on-time payments
    "late_30": 0,                     // INT: 30-day late payments
    "late_60": 0,                     // INT: 60-day late payments
    "late_90": 0,                     // INT: 90-day late payments
    "late_120": 0,                    // INT: 120+ day late payments
    "total_late": 0                   // INT: Total late payments
  }},
  "avg_account_age_months": 0,        // INT: Average account age in months
  "oldest_account_age_months": 0,     // INT: Oldest account age in months
  "total_accounts": 0,                // INT: Total number of open accounts
  "account_types": {{
    "revolving": 0,                   // INT: Number of revolving accounts (credit cards)
    "installment": 0,                 // INT: Number of installment accounts (loans, etc.)
    "mortgage": 0,                    // INT: Mortgage accounts
    "other": 0                        // INT: Other types (specify if known)
  }},
  "recent_hard_inquiries": 0,         // INT: Number of hard inquiries in last 12 months
  "negative_items": 0,                // INT: Number of negative/derogatory items (collections, bankruptcy, etc.)
  "negative_items_details": [],        // ARRAY: List of negative items, brief summary
  "credit_mix_score": "Good",         // STRING: Excellent, Good, Fair, Poor, Very Poor
  "risk_factors": [
    // ARRAY: Main reasons limiting the score, e.g., "High utilization", "Recent late payments"
  ],
  "strengths": [
    // ARRAY: Main positive points, e.g., "Flawless payment history", "Low credit utilization"
  ],
  "detailed_analysis": "STRING: A detailed but concise summary of the credit health. Include insights into trends, recent changes, and potential flags. This should be at least 3-4 paragraphs, with clear explanations for each major factor.",
  "improvement_advice": "STRING: Professional, practical advice for raising the score over the next 3-12 months. Be direct and specific. Include rationale for each step.",
  "action_steps": [
    // ARRAY: Step-by-step action plan (ordered by priority, with explanations for each step)
  ],
  "negative_item_plans": [
    // ARRAY: Recommended actions for each negative item (e.g., dispute error, negotiate, wait for fall-off), with explanations
  ],
  "roadmap_90_days": [
    // ARRAY: Monthly steps/goals for the next 3 months to boost credit profile, with expected outcomes
  ],
  "approval_advice": "STRING: What types of credit products (cards, loans, mortgages) the user will likely qualify for based on this profile, and what to do to improve approval odds.",
  "faq": [
    // ARRAY: 1-3 common credit score myths or questions, each with a clear, factual answer.
  ],
  "fico_factor_analysis": {{
    "payment_history": {{"status": "Good", "details": "No missed payments in 24 months", "explanation": "Detailed explanation of how payment history affects the score, with examples and steps to improve."}},
    "credit_utilization": {{"status": "Fair", "details": "Utilization at 45%, aim for <30%", "explanation": "Detailed explanation and step-by-step plan to reduce utilization."}},
    "credit_history_length": {{"status": "Good", "details": "Average account age is 5 years", "explanation": "Explanation of why account age matters and how to improve it."}},
    "new_credit": {{"status": "Fair", "details": "2 recent hard inquiries", "explanation": "Explanation of new credit impact and how to minimize negative effects."}},
    "credit_mix": {{"status": "Excellent", "details": "Diverse account types", "explanation": "Explanation of credit mix and how to optimize it."}}
  }}
}}
"""
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Please analyze my credit score/report and provide a deep, professional analysis and recommendations."}
            ],
            max_tokens=3000,
            temperature=0.7
        )
        
        # Check if response has content
        if not response.choices or not response.choices[0].message.content:
            print("❌ OpenAI returned empty response")
            raise Exception("OpenAI returned empty response")
            
        content = response.choices[0].message.content.strip()
        if not content:
            print("❌ OpenAI returned empty content")
            raise Exception("OpenAI returned empty content")
            
        print(f"✅ OpenAI response content: {content[:100]}...")
        try:
            analysis = json.loads(content)
            return analysis
        except json.JSONDecodeError as json_err:
            print(f"❌ JSON decode error: {json_err}")
            print(f"❌ Raw content: {content}")
            raise Exception(f"Invalid JSON response from OpenAI: {json_err}")
    except Exception as e:
        print(f"AI Analysis Error: {e}")
        # Fallback: Generate a deep, FICO-based analysis from comprehensive data
        score = crdt_data.get("personal_info", {}).get("credit_score", 0)
        payment_history = crdt_data.get("payment_history", {})
        credit_utilization = crdt_data.get("credit_utilization", {})
        credit_history_length = crdt_data.get("credit_history_length", {})
        new_credit = crdt_data.get("new_credit", {})
        credit_mix = crdt_data.get("credit_mix", {})
        derogatory_marks = crdt_data.get("derogatory_marks", {})
        risk_factors = crdt_data.get("risk_factors", {})
        
        # Calculate utilization from data
        utilization = credit_utilization.get("overall_utilization_ratio", 0)
        
        # Count negative items
        negative_items = derogatory_marks.get("total_derogatory_items", 0) if derogatory_marks else 0
        if payment_history:
            late_payments = payment_history.get("total_late_payments", 0) or 0
            if late_payments > 0:
                negative_items += late_payments
        
        # FICO factor analysis
        fico_factor_analysis = {
            "payment_history": {
                "weight": 35,
                "status": "Good" if not payment_history or (payment_history.get("total_late_payments", 0) or 0) == 0 else "Needs Improvement",
                "details": f"On-time payments: {payment_history.get('on_time_payments', 0) or 0 if payment_history else 0}, Late payments: {payment_history.get('total_late_payments', 0) or 0 if payment_history else 0}"
            },
            "credit_utilization": {
                "weight": 30,
                "status": "Good" if utilization <= 30 else "Needs Improvement",
                "details": f"Current utilization: {utilization:.1f}% (target: ≤30%)"
            },
            "credit_history_length": {
                "weight": 15,
                "status": "Good" if credit_history_length and (credit_history_length.get("average_account_age_months", 0) or 0) >= 84 else "Needs Improvement",
                "details": f"Average account age: {credit_history_length.get('average_account_age_months', 0) or 0 if credit_history_length else 0} months"
            },
            "credit_mix": {
                "weight": 10,
                "status": "Good" if credit_mix and (credit_mix.get("revolving_accounts", 0) > 0 and credit_mix.get("installment_accounts", 0) > 0) else "Needs Improvement",
                "details": f"Revolving: {credit_mix.get('revolving_accounts', 0) if credit_mix else 0}, Installment: {credit_mix.get('installment_accounts', 0) if credit_mix else 0}"
            },
            "new_credit": {
                "weight": 10,
                "status": "Good" if new_credit and (new_credit.get("recent_inquiries_12_months", 0) or 0) <= 2 else "Needs Improvement",
                "details": f"Recent inquiries: {new_credit.get('recent_inquiries_12_months', 0) if new_credit else 0} (12 months)"
            }
        }
        
        # Generate action steps based on data
        action_steps = []
        if payment_history:
            late_payments = payment_history.get("total_late_payments", 0) or 0
            if late_payments > 0:
                action_steps.append("Prioritize on-time payments - this is 35% of your FICO score and the most critical factor.")
        if utilization > 30:
            action_steps.append(f"Reduce credit utilization from {utilization:.1f}% to under 30% - this is 30% of your score.")
        if credit_history_length:
            avg_age = credit_history_length.get("average_account_age_months", 0) or 0
            if avg_age < 84:
                action_steps.append("Keep old accounts open and active to build credit history length (15% of score).")
        if new_credit:
            inquiries = new_credit.get("recent_inquiries_12_months")
            if not isinstance(inquiries, (int, float)) or inquiries is None:
                inquiries = 0
            if inquiries > 2:
                action_steps.append("Avoid new credit inquiries for the next 12 months to improve this factor (10% of score).")
        if derogatory_marks:
            derogatory_items = derogatory_marks.get("total_derogatory_items", 0) or 0
            if derogatory_items > 0:
                action_steps.append("Address derogatory marks by contacting creditors or collection agencies to negotiate removal.")
        
        # Add general advice if not enough specific steps
        while len(action_steps) < 5:
            action_steps.append("Monitor your credit report regularly and dispute any inaccuracies immediately.")
            break
        
        roadmap_90_days = [
            "Month 1: Focus on on-time payments and review credit report for errors. Set up payment reminders.",
            "Month 2: Reduce credit card balances to lower utilization ratio below 30%.",
            "Month 3: Avoid new credit applications and let existing accounts age naturally."
        ]
        
        faq = [
            "Myth: Checking your own credit hurts your score. Fact: Soft inquiries don't affect your score.",
            "Myth: Closing old accounts improves your score. Fact: It can actually lower your average account age.",
            "Myth: Paying off debt erases late payments. Fact: Late payments stay on your report for up to 7 years.",
            "Myth: Income affects your credit score. Fact: Income is not a factor in FICO scoring.",
            "Myth: All debts are equally bad. Fact: Installment loans are generally less risky than maxed-out credit cards."
        ]
        
        return {
            "credit_score": score,
            "credit_utilization": utilization,
            "payment_history": {
                "on_time": payment_history.get("on_time_payments", 0) if payment_history else 0,
                "late_30": payment_history.get("late_payments_30", 0) if payment_history else 0,
                "late_60": payment_history.get("late_payments_60", 0) if payment_history else 0,
                "late_90": payment_history.get("late_payments_90", 0) if payment_history else 0,
                "late_120": payment_history.get("late_payments_120", 0) if payment_history else 0,
                "total_late": payment_history.get("total_late_payments", 0) if payment_history else 0
            },
            "avg_account_age": credit_history_length.get("average_account_age_months", 0) if credit_history_length else 0,
            "account_types": credit_mix if credit_mix else {},
            "negative_items": negative_items,
            "risk_factors": [k for k, v in risk_factors.items() if v] if risk_factors else [],
            "detailed_analysis": f"Your credit score of {score} indicates {'excellent' if score >= 800 else 'very good' if score >= 740 else 'good' if score >= 670 else 'fair' if score >= 580 else 'poor'} credit health. Key factors affecting your score: Payment history ({fico_factor_analysis['payment_history']['status']}), Utilization ({fico_factor_analysis['credit_utilization']['status']}), Credit history ({fico_factor_analysis['credit_history_length']['status']}).",
            "improvement_advice": f"Focus on the highest-impact factors first: payment history (35% of score) and credit utilization (30% of score). Maintain on-time payments and keep utilization below 30% for optimal results.",
            "action_steps": action_steps,
            "negative_item_plans": ["Contact creditors to negotiate removal of negative items", "Set up payment plans for any outstanding collections", "Dispute any inaccurate information on your credit report"],
            "roadmap_90_days": roadmap_90_days,
            "approval_advice": f"With a score of {score}, you {'should qualify for most credit products with excellent terms' if score >= 740 else 'may qualify for many credit products but could benefit from score improvement' if score >= 670 else 'may face some challenges and should focus on score improvement before major applications'}.",
            "faq": faq,
            "fico_factor_analysis": fico_factor_analysis
        }

def call_openai(prompt):
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": prompt}
            ],
            max_tokens=2000,
            temperature=0.2
        )
        return response.choices[0].message.content if hasattr(response.choices[0], 'message') else response.choices[0].text
    except Exception as e:
        print(f"OpenAI API error: {e}")
        return "{}"

def extract_text_with_ai_vision(image_path):
    """
    Use AI vision to extract text from images, especially effective for:
    - Complex layouts and tables
    - Colored text and backgrounds
    - Different font sizes and styles
    - Handwritten text
    - Text in images with graphics
    """
    try:
        # Read the image file
        with open(image_path, "rb") as image_file:
            # Use OpenAI's GPT-4 Vision to extract text
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """You are an expert at reading credit reports and financial documents. 
                                Please extract ALL text content from this image, including:
                                
                                1. All numbers, amounts, dates, and percentages
                                2. Account names, types, and statuses
                                3. Personal information (names, addresses, SSNs)
                                4. Payment history and credit scores
                                5. Balances, limits, and utilization ratios
                                6. Any text in tables, charts, or complex layouts
                                7. Text in different colors, sizes, or fonts
                                8. Handwritten text if present
                                
                                Return the text exactly as it appears, maintaining the structure and formatting.
                                Do not interpret or summarize - just extract the raw text content."""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64.b64encode(image_file.read()).decode('utf-8')}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1
            )
            
            extracted_text = response.choices[0].message.content
            print(f"AI Vision extracted {len(extracted_text)} characters from {os.path.basename(image_path)}")
            return extracted_text
            
    except Exception as e:
        print(f"AI Vision extraction error for {image_path}: {e}")
        return ""

# --- Endpoints ---
@crdt_bp.route('/analysis', methods=['GET'])
@jwt_required()
@premium_required
def get_crdt_analysis():
    # No storage, so nothing to analyze
    return jsonify({'error': 'No crdt reports stored', 'message': 'Storage is disabled. Please upload a report for immediate analysis.'}), 404

@crdt_bp.route('/analyses', methods=['GET'])
@jwt_required()
@premium_required
def get_crdt_analyses():
    user_id = get_jwt_identity()
    analyses_path = os.path.join('user_data', str(user_id), 'analyses.json')
    if not os.path.exists(analyses_path):
        return jsonify([]), 200
    with open(analyses_path, 'r', encoding='utf-8') as f:
        try:
            analyses = json.load(f)
        except Exception:
            analyses = []
    return jsonify(analyses), 200

@crdt_bp.route('/reports', methods=['GET'])
@jwt_required()
@premium_required
def get_crdt_reports():
    return jsonify([])

@crdt_bp.route('/reports', methods=['POST'])
@jwt_required()
@premium_required
def add_crdt_report():
    user_id = get_jwt_identity()
    data = request.get_json()
    # Optionally process the data or run AI analysis
    financial_context = get_user_financial_context(user_id)
    analysis = analyze_crdt_report_with_ai(data, financial_context)
    return jsonify({'message': 'Report received and processed (not stored in DB)', 'analysis': analysis}), 200

@crdt_bp.route('/reports/<int:report_id>', methods=['PUT'])
@jwt_required()
@premium_required
def update_crdt_report(report_id):
    return jsonify({'error': 'Update not supported. Storage is disabled.'}), 400

@crdt_bp.route('/reports/<int:report_id>', methods=['DELETE'])
@jwt_required()
@premium_required
def delete_crdt_report(report_id):
    return jsonify({'error': 'Delete not supported. Storage is disabled.'}), 400

@crdt_bp.route('/alerts', methods=['GET'])
@jwt_required()
@premium_required
def get_crdt_alerts():
    return jsonify([])

@crdt_bp.route('/alerts', methods=['POST'])
@jwt_required()
@premium_required
def add_crdt_alert():
    return jsonify({'message': 'Alert received (not stored in DB)'}), 200

@crdt_bp.route('/alerts/<int:alert_id>', methods=['PUT'])
@jwt_required()
@premium_required
def update_crdt_alert(alert_id):
    return jsonify({'error': 'Update not supported. Storage is disabled.'}), 400

@crdt_bp.route('/alerts/<int:alert_id>', methods=['DELETE'])
@jwt_required()
@premium_required
def delete_crdt_alert(alert_id):
    return jsonify({'error': 'Delete not supported. Storage is disabled.'}), 400

@crdt_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_crdt_report():
    user_id = get_jwt_identity()
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    if file and file.filename.lower().endswith('.pdf'):
        # Optionally process the file here (extract text, run AI, etc.)
        # Do NOT insert into Supabase
        return jsonify({'message': 'File received and processed (not stored in DB)'}), 200
    else:
        return jsonify({'error': 'Invalid file type, only PDF allowed'}), 400

@crdt_bp.route('/download/<int:report_id>', methods=['GET'])
@jwt_required()
def download_crdt_report(report_id):
    user_id = get_jwt_identity()
    analyses_path = os.path.join('user_data', str(user_id), 'analyses.json')
    if not os.path.exists(analyses_path):
        return jsonify({'error': 'No analyzed reports found'}), 404
    with open(analyses_path, 'r', encoding='utf-8') as f:
        try:
            analyses = json.load(f)
        except Exception:
            return jsonify({'error': 'Failed to load analyzed reports'}), 500
    report = None
    for a in analyses:
        if str(a.get('id')) == str(report_id):
            report = a
            break
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    # PDF generation
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
            alignment=1
        )
        story.append(Paragraph("Credit Analysis Report", title_style))
        story.append(Spacer(1, 20))
        # Credit Score Summary
        story.append(Paragraph(f"<b>Credit Score:</b> {report.get('credit_score', 'N/A')}", styles['Normal']))
        story.append(Paragraph(f"<b>Credit Utilization:</b> {report.get('credit_utilization', 'N/A')}%", styles['Normal']))
        story.append(Paragraph(f"<b>Average Account Age:</b> {report.get('avg_account_age', 'N/A')} years", styles['Normal']))
        story.append(Paragraph(f"<b>Negative Items:</b> {report.get('negative_items', 'N/A')}", styles['Normal']))
        story.append(Spacer(1, 20))
        # Detailed Analysis
        if report.get('detailed_analysis'):
            story.append(Paragraph("<b>Detailed Analysis:</b>", styles['Heading2']))
            story.append(Paragraph(str(report['detailed_analysis']), styles['Normal']))
            story.append(Spacer(1, 20))
        # Improvement Advice
        if report.get('improvement_advice'):
            story.append(Paragraph("<b>Improvement Advice:</b>", styles['Heading2']))
            story.append(Paragraph(str(report['improvement_advice']), styles['Normal']))
            story.append(Spacer(1, 20))
        # Action Steps
        if report.get('action_steps'):
            story.append(Paragraph("<b>Action Steps:</b>", styles['Heading2']))
            for i, step in enumerate(report['action_steps'], 1):
                story.append(Paragraph(f"{i}. {step}", styles['Normal']))
            story.append(Spacer(1, 20))
        # 90-Day Roadmap
        if report.get('roadmap_90_days'):
            story.append(Paragraph("<b>90-Day Improvement Roadmap:</b>", styles['Heading2']))
            for i, milestone in enumerate(report['roadmap_90_days'], 1):
                story.append(Paragraph(f"Month {i}: {milestone}", styles['Normal']))
            story.append(Spacer(1, 20))
        # Approval Advice
        if report.get('approval_advice'):
            story.append(Paragraph("<b>Approval Advice:</b>", styles['Heading2']))
            story.append(Paragraph(str(report['approval_advice']), styles['Normal']))
            story.append(Spacer(1, 20))
        # FAQ
        if report.get('faq'):
            story.append(Paragraph("<b>Frequently Asked Questions:</b>", styles['Heading2']))
            for faq in report['faq']:
                story.append(Paragraph(f"• {faq}", styles['Normal']))
        doc.build(story)
        response = send_file(tmp_pdf.name, as_attachment=True, download_name=f'credit_analysis_{report_id}.pdf')
        return response

@crdt_bp.route('/generate-disputes', methods=['POST'])
@jwt_required()
@vip_required
def generate_disputes_from_analysis():
    # This is a stub for AI-based dispute generation
    disputes = [
        {'item': 'Sample negative item', 'reason': 'Incorrect reporting', 'priority': 'high'}
    ]
    return jsonify({'disputes': disputes, 'message': 'Disputes generated (stub, not stored)'}), 200

@crdt_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_crdt_report_api():
    user_id = get_jwt_identity()
    data = request.get_json()
    financial_context = get_user_financial_context(user_id)
    analysis = analyze_crdt_report_with_ai(data, financial_context)
    return jsonify({'analysis': analysis, 'message': 'Analysis complete (not stored in DB)'}), 200

@crdt_bp.route('/analysis/<analysis_id>', methods=['GET'])
@jwt_required()
def get_analysis_by_id(analysis_id):
    user_id = get_jwt_identity()
    analyses_path = os.path.join('user_data', str(user_id), 'analyses.json')
    if not os.path.exists(analyses_path):
        return jsonify({'error': 'No analyses found.'}), 404
    with open(analyses_path, 'r', encoding='utf-8') as f:
        try:
            analyses = json.load(f)
        except Exception:
            return jsonify({'error': 'Failed to load analyses.'}), 500
    for analysis in analyses:
        if str(analysis.get('id')) == str(analysis_id):
            return jsonify({'analysis': analysis}), 200
    return jsonify({'error': 'Analysis not found.'}), 404

@crdt_bp.route('/upload-images', methods=['POST'])
@jwt_required()
def upload_images():
    user_id = get_jwt_identity()
    if 'files' not in request.files:
        return jsonify({'error': 'No files part'}), 400
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files uploaded'}), 400
    user_folder = os.path.join('user_data', str(user_id))
    os.makedirs(user_folder, exist_ok=True)
    saved_files = []
    for file in files:
        if file.filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            filename = secure_filename(file.filename)
            save_path = os.path.join(user_folder, filename)
            file.save(save_path)
            saved_files.append(save_path)
        else:
            return jsonify({'error': 'Invalid file type, only JPG/PNG allowed'}), 400
    return jsonify({'message': f'{len(saved_files)} files uploaded', 'files': saved_files}), 200

CREDIT_REPORT_SCHEMA = {
    "personal_info": dict,
    "payment_history": dict,
    "credit_utilization": dict,
    "accounts": list,
    "credit_history_length": dict,
    "new_credit": dict,
    "credit_mix": dict,
    "collections": list,
    "public_records": list,
    "derogatory_marks": dict,
    "inquiries": list,
    "account_summary": dict,
    "utilization_details": dict,
    "risk_factors": dict
}

AI_EXTRACTION_PROMPT = '''You are an expert credit report analyst. Extract ALL comprehensive credit information from the provided text with extreme attention to detail. This is critical for FICO score analysis and credit improvement planning.

IMPORTANT INSTRUCTIONS:
1. Look for ANY numbers, dates, names, amounts, percentages, or account details
2. Extract credit scores (look for "score", "FICO", "credit score", numbers 300-900)
3. Find ALL account balances, credit limits, and payment amounts
4. Identify payment history patterns (OK, 30, 60, 90, 120+ days late)
5. Calculate utilization ratios where possible (balance/limit * 100)
6. Extract account opening dates and calculate ages
7. Find ALL inquiries, collections, and derogatory marks. For each inquiry, classify if it is a 'hard' or 'soft' inquiry based on context (e.g., credit card/auto/mortgage applications are usually 'hard', account review/marketing are 'soft').
8. Look for personal information (name, address, SSN, DOB)
9. Identify account types (credit card, auto loan, mortgage, etc.)

SEARCH PATTERNS TO LOOK FOR:
- Credit scores: "score", "FICO", "credit score", "rating"
- Balances: "$", "balance", "amount owed", "outstanding"
- Limits: "limit", "credit line", "available credit"
- Dates: "opened", "opening date", "since", "date"
- Payments: "payment", "paid", "late", "30", "60", "90", "120"
- Inquiries: "inquiry", "inquiries", "hard pull", "soft pull"
- Collections: "collection", "charged off", "default"
- Personal: "name", "address", "SSN", "DOB", "birth"

Return ONLY a valid JSON object with this exact structure. Use numbers for amounts, dates as strings, and null for missing data:

{
  "personal_info": {
    "name": "string or null",
    "address": "string or null", 
    "date_of_birth": "string or null",
    "ssn_last4": "string or null",
    "credit_score": "number or null",
    "employment": "string or null"
  },
  "payment_history": {
    "on_time_payments": "number or null",
    "late_payments_30": "number or null",
    "late_payments_60": "number or null",
    "late_payments_90": "number or null", 
    "late_payments_120": "number or null",
    "total_late_payments": "number or null",
    "payment_pattern": "string or null"
  },
  "credit_utilization": {
    "total_outstanding_debt": "number or null",
    "total_credit_limits": "number or null",
    "overall_utilization_ratio": "number or null",
    "accounts_with_balances": "number or null",
    "high_utilization_accounts": "number or null"
  },
  "accounts": [
    {
      "name": "string or null",
      "type": "string (credit_card|auto_loan|mortgage|student_loan|personal_loan|retail|other) or null",
      "account_number": "string or null",
      "balance": "number or null",
      "credit_limit": "number or null", 
      "utilization": "number or null",
      "status": "string (open|closed|paid|charge_off|collection) or null",
      "opened_date": "string or null",
      "closed_date": "string or null",
      "payment_history": [],
      "negative_items": [],
      "is_authorized_user": "boolean or null",
      "account_age_months": "number or null"
    }
  ],
  "credit_history_length": {
    "oldest_account_age_months": "number or null",
    "newest_account_age_months": "number or null",
    "average_account_age_months": "number or null", 
    "time_since_last_activity_months": "number or null"
  },
  "new_credit": {
    "recent_inquiries_12_months": "number or null",
    "recent_inquiries_24_months": "number or null",
    "new_accounts_opened_12_months": "number or null",
    "new_accounts_opened_24_months": "number or null",
    "time_since_newest_account_months": "number or null"
  },
  "credit_mix": {
    "revolving_accounts": "number or null",
    "installment_accounts": "number or null",
    "mortgage_accounts": "number or null",
    "auto_loan_accounts": "number or null",
    "student_loan_accounts": "number or null",
    "retail_accounts": "number or null",
    "other_accounts": "number or null"
  },
  "collections": [],
  "public_records": [],
  "derogatory_marks": {
    "total_derogatory_items": "number or null",
    "bankruptcies": "number or null",
    "foreclosures": "number or null",
    "repossessions": "number or null",
    "tax_liens": "number or null",
    "civil_judgments": "number or null",
    "settlements": "number or null"
  },
  "inquiries": [
    {
      "name": "string or null",
      "date": "string or null",
      "type": "string or null",
      "hard_or_soft": "string ('hard' or 'soft') or null"
    }
  ],
  "account_summary": {
    "total_accounts": "number or null",
    "open_accounts": "number or null",
    "closed_accounts": "number or null",
    "accounts_with_balances": "number or null",
    "accounts_paid_as_agreed": "number or null",
    "accounts_with_negative_history": "number or null"
  },
  "utilization_details": {
    "credit_cards_utilization": "number or null",
    "auto_loans_utilization": "number or null",
    "mortgage_utilization": "number or null",
    "student_loans_utilization": "number or null",
    "other_utilization": "number or null"
  },
  "risk_factors": {
    "high_utilization": "boolean or null",
    "recent_late_payments": "boolean or null",
    "multiple_inquiries": "boolean or null",
    "short_credit_history": "boolean or null",
    "limited_credit_mix": "boolean or null",
    "derogatory_items": "boolean or null"
  }
}'''

@crdt_bp.route('/read-info', methods=['POST'])
@jwt_required()
def read_info():
    user_id = get_jwt_identity()
    user_folder = os.path.join('user_data', str(user_id))
    if not os.path.exists(user_folder):
        return jsonify({'error': 'No uploaded images found'}), 400
    
    # Step 1: Extract text using OCR (for standard text)
    ocr_extracted_text = ""
    # Step 2: Extract text using AI vision (for complex layouts, colors, fonts)
    ai_vision_extracted_text = ""
    image_files = []
    
    for fname in os.listdir(user_folder):
        if fname.lower().endswith(('.jpg', '.jpeg', '.png')):
            img_path = os.path.join(user_folder, fname)
            image_files.append(fname)
            
            try:
                # OCR Extraction (Step 1)
                img = preprocess_image_for_ocr(img_path)
                if img is None:
                    img = Image.open(img_path)  # Fallback to original
                
                # Configure OCR for better accuracy
                custom_config = r'--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,$%()/\-: '
                ocr_text = pytesseract.image_to_string(img, config=custom_config)
                ocr_text = ocr_text.replace('\n\n', '\n').strip()
                ocr_extracted_text += f"\n\n=== OCR EXTRACTION: {fname} ===\n{ocr_text}"
                print(f"OCR extracted {len(ocr_text)} characters from {fname}")
                
                # AI Vision Extraction (Step 2) - for complex layouts, colors, fonts
                ai_vision_text = extract_text_with_ai_vision(img_path)
                ai_vision_extracted_text += f"\n\n=== AI VISION EXTRACTION: {fname} ===\n{ai_vision_text}"
                print(f"AI Vision extracted {len(ai_vision_text)} characters from {fname}")
                
            except Exception as e:
                print(f"Extraction Error for {fname}: {e}")
                continue
    
    if not ocr_extracted_text.strip() and not ai_vision_extracted_text.strip():
        return jsonify({'error': 'No text could be extracted from uploaded documents'}), 400
    
    # Combine all extracted text for summary
    all_extracted_text = f"OCR EXTRACTION:\n{ocr_extracted_text}\n\nAI VISION EXTRACTION:\n{ai_vision_extracted_text}"
    
    # Step 3: AI Interpreter combines and validates both sources
    interpreter_prompt = f"""You are an expert credit report analyst with access to TWO different extraction methods:

SOURCE 1 - OCR EXTRACTION (Traditional text recognition):
{ocr_extracted_text}

SOURCE 2 - AI VISION EXTRACTION (Advanced image analysis for complex layouts, colors, fonts):
{ai_vision_extracted_text}

Your task is to:
1. Compare and cross-reference information from both sources
2. Resolve any conflicts or discrepancies
3. Combine the best information from both sources
4. Fill in gaps where one source missed information that the other found
5. Create a comprehensive, accurate credit report analysis

For each inquiry, classify if it is a 'hard' or 'soft' inquiry based on context (e.g., credit card/auto/mortgage applications are usually 'hard', account review/marketing are 'soft'). Add this as a 'hard_or_soft' field for each inquiry in the JSON.

CRITICAL ANALYSIS GUIDELINES:
- If OCR missed information due to font colors, sizes, or layouts, use AI Vision data
- If AI Vision has unclear text, verify with OCR data
- For numbers and amounts, prefer the most consistent value across sources
- For personal information, be extra careful about accuracy
- If sources conflict, use the more detailed or specific information

Extract and return ALL credit information in this exact JSON format (use null for missing data):

{{
  "personal_info": {{
    "name": "string or null",
    "address": "string or null", 
    "date_of_birth": "string or null",
    "ssn_last4": "string or null",
    "credit_score": "number or null",
    "employment": "string or null"
  }},
  "payment_history": {{
    "on_time_payments": "number or null",
    "late_payments_30": "number or null",
    "late_payments_60": "number or null",
    "late_payments_90": "number or null", 
    "late_payments_120": "number or null",
    "total_late_payments": "number or null",
    "payment_pattern": "string or null"
  }},
  "credit_utilization": {{
    "total_outstanding_debt": "number or null",
    "total_credit_limits": "number or null",
    "overall_utilization_ratio": "number or null",
    "accounts_with_balances": "number or null",
    "high_utilization_accounts": "number or null"
  }},
  "accounts": [
    {{
      "name": "string or null",
      "type": "string (credit_card|auto_loan|mortgage|student_loan|personal_loan|retail|other) or null",
      "account_number": "string or null",
      "balance": "number or null",
      "credit_limit": "number or null", 
      "utilization": "number or null",
      "status": "string (open|closed|paid|charge_off|collection) or null",
      "opened_date": "string or null",
      "closed_date": "string or null",
      "payment_history": [],
      "negative_items": [],
      "is_authorized_user": "boolean or null",
      "account_age_months": "number or null"
    }}
  ],
  "credit_history_length": {{
    "oldest_account_age_months": "number or null",
    "newest_account_age_months": "number or null",
    "average_account_age_months": "number or null", 
    "time_since_last_activity_months": "number or null"
  }},
  "new_credit": {{
    "recent_inquiries_12_months": "number or null",
    "recent_inquiries_24_months": "number or null",
    "new_accounts_opened_12_months": "number or null",
    "new_accounts_opened_24_months": "number or null",
    "time_since_newest_account_months": "number or null"
  }},
  "credit_mix": {{
    "revolving_accounts": "number or null",
    "installment_accounts": "number or null",
    "mortgage_accounts": "number or null",
    "auto_loan_accounts": "number or null",
    "student_loan_accounts": "number or null",
    "retail_accounts": "number or null",
    "other_accounts": "number or null"
  }},
  "collections": [],
  "public_records": [],
  "derogatory_marks": {{
    "total_derogatory_items": "number or null",
    "bankruptcies": "number or null",
    "foreclosures": "number or null",
    "repossessions": "number or null",
    "tax_liens": "number or null",
    "civil_judgments": "number or null",
    "settlements": "number or null"
  }},
  "inquiries": [
    {{
      "name": "string or null",
      "date": "string or null",
      "type": "string or null",
      "hard_or_soft": "string ('hard' or 'soft') or null"
    }}
  ],
  "account_summary": {{
    "total_accounts": "number or null",
    "open_accounts": "number or null",
    "closed_accounts": "number or null",
    "accounts_with_balances": "number or null",
    "accounts_paid_as_agreed": "number or null",
    "accounts_with_negative_history": "number or null"
  }},
  "utilization_details": {{
    "credit_cards_utilization": "number or null",
    "auto_loans_utilization": "number or null",
    "mortgage_utilization": "number or null",
    "student_loans_utilization": "number or null",
    "other_utilization": "number or null"
  }},
  "risk_factors": {{
    "high_utilization": "boolean or null",
    "recent_late_payments": "boolean or null",
    "multiple_inquiries": "boolean or null",
    "short_credit_history": "boolean or null",
    "limited_credit_mix": "boolean or null",
    "derogatory_items": "boolean or null"
  }}
}}

IMPORTANT: Return ONLY the JSON object, no additional text or explanations."""
    
    # Step 4: Get AI Interpreter response
    print(f"Processing {len(image_files)} documents with dual-source extraction")
    print(f"OCR text length: {len(ocr_extracted_text)}")
    print(f"AI Vision text length: {len(ai_vision_extracted_text)}")
    
    try:
        interpreter_response = call_openai(interpreter_prompt)
        print(f"AI Interpreter response received, length: {len(interpreter_response)}")
        
        # Clean the AI response
        cleaned_response = interpreter_response.strip()
        
        # Remove markdown code blocks if present
        if cleaned_response.startswith('```json'):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith('```'):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith('```'):
            cleaned_response = cleaned_response[:-3]
        
        cleaned_response = cleaned_response.strip()
        
        # Try to find JSON within the response if it doesn't start with {
        if not cleaned_response.startswith('{'):
            start_idx = cleaned_response.find('{')
            end_idx = cleaned_response.rfind('}')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                cleaned_response = cleaned_response[start_idx:end_idx+1]
        
        print(f"Cleaned response length: {len(cleaned_response)}")
        print(f"Response starts with: {cleaned_response[:100]}...")
        
        # Parse JSON
        data = json.loads(cleaned_response)
        print("✅ Successfully parsed AI response")

        # === PATCH: Use declared score if extracted score is missing or invalid ===
        declared_score = None
        try:
            declared_score = request.json.get('credit_score')
        except Exception:
            declared_score = None
        extracted_score = None
        if 'personal_info' in data:
            extracted_score = data['personal_info'].get('credit_score')
        def is_invalid_score(val):
            try:
                if val is None:
                    return True
                if isinstance(val, str) and (val.strip() == '' or val.strip() == '0'):
                    return True
                if isinstance(val, (int, float)) and float(val) == 0:
                    return True
                # If not a number
                float_val = float(val)
                if float_val < 200 or float_val > 900:
                    return True
            except Exception:
                return True
            return False
        if is_invalid_score(extracted_score) and declared_score:
            data['personal_info']['credit_score'] = declared_score
            print(f"[PATCH] Used declared credit score: {declared_score}")
        else:
            print(f"[PATCH] Used extracted credit score: {extracted_score}")
        # === END PATCH ===

        # === PATCH: Ensure inquiries are always present if found in new_credit ===
        if (not data.get('inquiries') or len(data.get('inquiries', [])) == 0):
            nc = data.get('new_credit', {})
            count = nc.get('recent_inquiries_12_months')
            print(f"[DEBUG] No inquiries found in extraction. new_credit.recent_inquiries_12_months: {count}")
            if count and isinstance(count, (int, float)) and count > 0:
                # Create synthetic inquiries
                data['inquiries'] = [
                    {'name': 'Unknown', 'date': 'N/A', 'type': 'Hard Inquiry'} for _ in range(int(count))
                ]
                print(f"[PATCH] Created {count} synthetic inquiries from new_credit.recent_inquiries_12_months")
        print(f"[DEBUG] Final data['inquiries'] before summary: {data.get('inquiries')}")
        # === END PATCH ===

        # Step 4: Calculate derived metrics
        data = calculate_derived_metrics(data)
        
        # Step 5: Create comprehensive summary for keep.txt
        summary = []
        summary.append("=== COMPREHENSIVE CREDIT REPORT ANALYSIS ===")
        summary.append(f"Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        summary.append(f"Documents Processed: {', '.join(image_files)}")
        summary.append(f"Total Text Extracted: {len(all_extracted_text)} characters")
        summary.append("")
        
        # === PERSONAL INFO / CREDIT SCORE SECTION ===
        if data.get('personal_info'):
            summary.append("=== PERSONAL INFO ===")
            pi = data['personal_info']
            summary.append(f"Name: {pi.get('name', 'N/A')}")
            summary.append(f"Address: {pi.get('address', 'N/A')}")
            summary.append(f"Date of Birth: {pi.get('date_of_birth', 'N/A')}")
            summary.append(f"Credit Score: {pi.get('credit_score', 'N/A')}")
            summary.append("")
        
        # Payment History (Most Important - 35% of FICO)
        if data.get('payment_history'):
            ph = data['payment_history']
            summary.append("=== PAYMENT HISTORY (35% of FICO Score) ===")
            summary.append(f"On-time Payments: {ph.get('on_time_payments', 0)}")
            summary.append(f"Late Payments - 30 days: {ph.get('late_payments_30', 0)}")
            summary.append(f"Late Payments - 60 days: {ph.get('late_payments_60', 0)}")
            summary.append(f"Late Payments - 90 days: {ph.get('late_payments_90', 0)}")
            summary.append(f"Late Payments - 120+ days: {ph.get('late_payments_120', 0)}")
            summary.append(f"Total Late Payments: {ph.get('total_late_payments', 0)}")
            summary.append(f"Payment Pattern: {ph.get('payment_pattern', 'N/A')}")
            summary.append("")
        
        # Credit Utilization (30% of FICO)
        if data.get('credit_utilization'):
            cu = data['credit_utilization']
            summary.append("=== CREDIT UTILIZATION (30% of FICO Score) ===")
            total_debt = cu.get('total_outstanding_debt', 0) or 0
            total_limits = cu.get('total_credit_limits', 0) or 0
            utilization_ratio = cu.get('overall_utilization_ratio', 0) or 0
            accounts_with_balances = cu.get('accounts_with_balances', 0) or 0
            high_utilization = cu.get('high_utilization_accounts', 0) or 0
            
            summary.append(f"Total Outstanding Debt: ${total_debt:,.2f}")
            summary.append(f"Total Credit Limits: ${total_limits:,.2f}")
            summary.append(f"Overall Utilization Ratio: {utilization_ratio:.1f}%")
            summary.append(f"Accounts with Balances: {accounts_with_balances}")
            summary.append(f"High Utilization Accounts: {high_utilization}")
            summary.append("")
        
        # Individual Accounts
        if data.get('accounts'):
            summary.append("=== INDIVIDUAL ACCOUNTS ===")
            summary.append(f"Total Accounts: {len(data['accounts'])}")
            for i, acc in enumerate(data['accounts'], 1):
                summary.append(f"\nAccount {i}:")
                summary.append(f"  Name: {acc.get('name', 'N/A')}")
                summary.append(f"  Type: {acc.get('type', 'N/A')}")
                
                balance = acc.get('balance', 0) or 0
                credit_limit = acc.get('credit_limit', 0) or 0
                utilization = acc.get('utilization', 0) or 0
                account_age = acc.get('account_age_months', 0) or 0
                
                summary.append(f"  Balance: ${balance:,.2f}")
                summary.append(f"  Credit Limit: ${credit_limit:,.2f}")
                summary.append(f"  Utilization: {utilization:.1f}%")
                summary.append(f"  Status: {acc.get('status', 'N/A')}")
                summary.append(f"  Opened: {acc.get('opened_date', 'N/A')}")
                summary.append(f"  Account Age: {account_age} months")
                if acc.get('is_authorized_user'):
                    summary.append(f"  Authorized User: Yes")
            summary.append("")
        # --- PATCH: Add Credit Inquiries Section ---
        if data.get('inquiries') is not None:
            summary.append("=== CREDIT INQUIRIES ===")
            inquiries = data.get('inquiries', [])
            def map_inquiry_type(category):
                if not category:
                    return 'Hard Inquiry'
                cat = str(category).lower()
                # Common hard inquiry categories
                hard_keywords = ['auto', 'automotive', 'mortgage', 'credit', 'loan', 'bank', 'finance', 'card', 'installment', 'retail', 'student']
                # Common soft inquiry keywords
                soft_keywords = ['account review', 'pre-approval', 'preapproval', 'soft', 'marketing', 'insurance', 'employment', 'utility']
                if any(k in cat for k in hard_keywords):
                    return 'Hard Inquiry'
                if any(k in cat for k in soft_keywords):
                    return 'Soft Inquiry'
                return 'Hard Inquiry'  # Default to hard
            if inquiries and isinstance(inquiries, list) and len(inquiries) > 0:
                for i, inquiry in enumerate(inquiries, 1):
                    if isinstance(inquiry, dict):
                        name = inquiry.get('name', 'N/A')
                        date = inquiry.get('date', 'N/A')
                        category = inquiry.get('type', 'N/A')
                        mapped_type = map_inquiry_type(category)
                        summary.append(f"Inquiry {i}: Name: {name}, Type: {mapped_type} ({category}), Date: {date}")
                    else:
                        summary.append(f"Inquiry {i}: {inquiry}")
            else:
                summary.append("No credit inquiries found.")
            summary.append("")
        # --- END PATCH ---
        # --- NEW: Add Recent Inquiries (10% of FICO Score) Section ---
        if data.get('inquiries') is not None:
            summary.append("=== RECENT INQUIRIES (10% of FICO Score) ===")
            inquiries = data.get('inquiries', [])
            def map_inquiry_type(category):
                if not category:
                    return 'Hard Inquiry'
                cat = str(category).lower()
                hard_keywords = ['auto', 'automotive', 'mortgage', 'credit', 'loan', 'bank', 'finance', 'card', 'installment', 'retail', 'student']
                soft_keywords = ['account review', 'pre-approval', 'preapproval', 'soft', 'marketing', 'insurance', 'employment', 'utility']
                if any(k in cat for k in hard_keywords):
                    return 'Hard Inquiry'
                if any(k in cat for k in soft_keywords):
                    return 'Soft Inquiry'
                return 'Hard Inquiry'  # Default to hard
            if inquiries and isinstance(inquiries, list) and len(inquiries) > 0:
                for i, inquiry in enumerate(inquiries, 1):
                    if isinstance(inquiry, dict):
                        type_ = inquiry.get('type', 'N/A')
                        name = inquiry.get('name', 'N/A')
                        date = inquiry.get('date', 'N/A')
                        bearing = map_inquiry_type(type_)
                        summary.append(f"Inquiry {i}: Type: {type_}, Bearing: {bearing}, Name: {name}, Date: {date}")
                    else:
                        summary.append(f"Inquiry {i}: {inquiry}")
            else:
                summary.append("No recent inquiries found.")
            summary.append("")
        # --- END NEW ---
        
        # Risk Factors
        if data.get('risk_factors'):
            rf = data['risk_factors']
            summary.append("=== RISK FACTORS ===")
            risk_items = []
            if rf.get('high_utilization'): risk_items.append("High Utilization")
            if rf.get('recent_late_payments'): risk_items.append("Recent Late Payments")
            if rf.get('multiple_inquiries'): risk_items.append("Multiple Inquiries")
            if rf.get('short_credit_history'): risk_items.append("Short Credit History")
            if rf.get('limited_credit_mix'): risk_items.append("Limited Credit Mix")
            if rf.get('derogatory_items'): risk_items.append("Derogatory Items")
            summary.append(f"Risk Factors: {', '.join(risk_items) if risk_items else 'None identified'}")
            summary.append("")
        
        # Raw extracted text for reference
        summary.append("=== RAW EXTRACTED TEXT (for reference) ===")
        summary.append(all_extracted_text[:2000] + "..." if len(all_extracted_text) > 2000 else all_extracted_text)
        
        # Step 6: Save data
        valuable_data = [data]
        
        # Save structured data
        keep_path = os.path.join(user_folder, 'credit_details.keep')
        with open(keep_path, 'w', encoding='utf-8') as f:
            json.dump(valuable_data, f, indent=2)
        
        # Save human-readable summary
        keep_txt_path = os.path.join(user_folder, 'keep.txt')
        with open(keep_txt_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(summary))
        
        print(f"✅ Successfully saved data to {keep_path} and {keep_txt_path}")
        
        return jsonify({'details': valuable_data, 'message': 'Credit information extracted successfully'})
        
    except Exception as e:
        print(f"❌ Error in AI processing: {e}")
        return jsonify({'error': f'Failed to process credit information: {str(e)}'}), 500

@crdt_bp.route('/credit-details', methods=['GET'])
@jwt_required()
def get_credit_details():
    user_id = get_jwt_identity()
    keep_path = os.path.join('user_data', str(user_id), 'credit_details.keep')
    if not os.path.exists(keep_path):
        return jsonify({'error': 'No extracted credit details found'}), 404
    with open(keep_path, 'r', encoding='utf-8') as f:
        details = json.load(f)
    return jsonify({'details': details}), 200

@crdt_bp.route('/credit-details-summary', methods=['GET'])
@jwt_required()
def get_credit_details_summary():
    user_id = get_jwt_identity()
    keep_txt_path = os.path.join('user_data', str(user_id), 'keep.txt')
    if not os.path.exists(keep_txt_path):
        return jsonify({'summary': ''}), 200
    with open(keep_txt_path, 'r', encoding='utf-8') as f:
        summary = f.read()
    return jsonify({'summary': summary}), 200

@crdt_bp.route('/analyze-and-save', methods=['POST'])
@jwt_required()
def analyze_and_save():
    user_id = get_jwt_identity()
    request_data = request.get_json() or {}
    keep_path = os.path.join('user_data', str(user_id), 'credit_details.keep')
    crdt_data = {}
    if os.path.exists(keep_path):
        with open(keep_path, 'r', encoding='utf-8') as f:
            details = json.load(f)
        crdt_data = details[0] if details else {}
    if 'credit_score' in request_data:
        if 'personal_info' not in crdt_data:
            crdt_data['personal_info'] = {}
        crdt_data['personal_info']['credit_score'] = request_data['credit_score']
    if not crdt_data and 'credit_score' not in request_data:
        return jsonify({'error': 'No credit details found. Please upload documents and click "Read Info" first, or provide a credit score.'}), 404
    if not crdt_data and 'credit_score' in request_data:
        crdt_data = {
            'personal_info': {
                'credit_score': request_data['credit_score']
            },
            'accounts': [],
            'collections': [],
            'public_records': [],
            'inquiries': []
        }
    financial_context = get_user_financial_context(user_id)
    analysis = analyze_crdt_report_with_ai(crdt_data, financial_context)
    # Assign unique ID and timestamp
    analysis_id = str(uuid.uuid4())
    analysis['id'] = analysis_id
    analysis['timestamp'] = datetime.utcnow().isoformat()
    # Save analysis report as latest
    report_path = os.path.join('user_data', str(user_id), 'analysis_report.json')
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(analysis, f, indent=2)
    # Save to analyses.json (list of all analyses)
    analyses_path = os.path.join('user_data', str(user_id), 'analyses.json')
    analyses = []
    if os.path.exists(analyses_path):
        with open(analyses_path, 'r', encoding='utf-8') as f:
            try:
                analyses = json.load(f)
            except Exception:
                analyses = []
    analyses.append(analysis)
    with open(analyses_path, 'w', encoding='utf-8') as f:
        json.dump(analyses, f, indent=2)
    return jsonify({'analysis': analysis}), 200

@crdt_bp.route('/clear-data', methods=['POST'])
@jwt_required()
def clear_data():
    """Clear user data excluding analyzed reports (which have their own delete buttons)"""
    user_id = get_jwt_identity()
    user_folder = os.path.join('user_data', str(user_id))
    
    if not os.path.exists(user_folder):
        return jsonify({'message': 'No data to clear'}), 200
    
    try:
        # Clear keep.txt file
        keep_file = os.path.join(user_folder, 'keep.txt')
        if os.path.exists(keep_file):
            os.remove(keep_file)
            print(f"Cleared keep.txt for user {user_id}")
        
        # Clear credit_details.keep file
        credit_details_file = os.path.join(user_folder, 'credit_details.keep')
        if os.path.exists(credit_details_file):
            os.remove(credit_details_file)
            print(f"Cleared credit_details.keep for user {user_id}")
        
        # Clear uploaded images
        cleared_files = []
        for filename in os.listdir(user_folder):
            if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                file_path = os.path.join(user_folder, filename)
                os.remove(file_path)
                cleared_files.append(filename)
                print(f"Cleared image {filename} for user {user_id}")
        
        return jsonify({
            'message': 'Data cleared successfully (analyzed reports preserved)',
            'cleared_files': cleared_files,
            'cleared_keep_txt': os.path.exists(keep_file) == False,
            'cleared_credit_details': os.path.exists(credit_details_file) == False,
            'note': 'Analyzed reports were preserved as they are official documents with their own delete functionality'
        }), 200
        
    except Exception as e:
        print(f"Error clearing data for user {user_id}: {e}")
        return jsonify({'error': f'Failed to clear data: {str(e)}'}), 500 

@crdt_bp.route('/analysis/<analysis_id>', methods=['DELETE'])
@jwt_required()
def delete_analyzed_report(analysis_id):
    user_id = get_jwt_identity()
    analyses_path = os.path.join('user_data', str(user_id), 'analyses.json')
    if not os.path.exists(analyses_path):
        return jsonify({'error': 'No analyzed reports found'}), 404
    with open(analyses_path, 'r', encoding='utf-8') as f:
        try:
            analyses = json.load(f)
        except Exception:
            analyses = []
    new_analyses = [a for a in analyses if str(a.get('id')) != str(analysis_id)]
    with open(analyses_path, 'w', encoding='utf-8') as f:
        json.dump(new_analyses, f, indent=2)
    return jsonify({'message': 'Analyzed report deleted'}), 200

@crdt_bp.route('/analyses', methods=['DELETE'])
@jwt_required()
def clear_analyzed_reports():
    user_id = get_jwt_identity()
    analyses_path = os.path.join('user_data', str(user_id), 'analyses.json')
    if os.path.exists(analyses_path):
        with open(analyses_path, 'w', encoding='utf-8') as f:
            json.dump([], f)
    return jsonify({'message': 'All analyzed reports deleted'}), 200 