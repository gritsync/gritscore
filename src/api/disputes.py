from flask import Blueprint, jsonify, current_app, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from .subscription import premium_required, vip_required
import os
from openai import OpenAI
import json
from datetime import datetime
import uuid
import traceback
import re
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from src.services.supabase_client import supabase, get_supabase_from_request

disputes_bp = Blueprint('disputes', __name__)
LOCAL_DISPUTES_FILE = 'local_disputes.json'

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

def load_disputes():
    if not os.path.exists(LOCAL_DISPUTES_FILE):
        return []
    with open(LOCAL_DISPUTES_FILE, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except Exception:
            return []

def save_disputes(disputes):
    with open(LOCAL_DISPUTES_FILE, 'w', encoding='utf-8') as f:
        json.dump(disputes, f, indent=2)

def generate_dispute_letter_ai(dispute_data, credit_context):
    """Generate a professional dispute letter using AI."""
    try:
        # Explicitly instruct the AI to use the provided user info fields in the letter
        system_prompt = f"""You are a professional credit dispute specialist. Generate a formal dispute letter for the following credit item.

=== DISPUTE INFORMATION ===
{json.dumps(dispute_data, indent=2)}

=== CREDIT CONTEXT ===
{json.dumps(credit_context, indent=2)}

Generate a professional, legally-sound dispute letter that includes:

1. **Proper Formatting** - Format the letter as an official business letter, with justified alignment (text should be aligned on both left and right margins). The sender's name at the start and end of the letter, and the subject/title line (e.g., 'RE: Dispute of credit report ...'), should be clearly visible but do NOT use Markdown, asterisks, or any special formatting. Use plain text only. After the closing 'Sincerely,' add two line breaks before the sender's name at the end of the letter.
2. **Clear Identification** - Specific account/item being disputed with account numbers if available
3. **Reason for Dispute** - Clear explanation of why the item is incorrect or inaccurate
4. **Supporting Evidence** - What evidence supports the dispute claim
5. **Request for Action** - What you want the credit bureau to do (remove, correct, investigate)
6. **Professional Tone** - Firm but respectful language
7. **Contact Information** - Use the provided fields for the sender's contact details at the top of the letter. DO NOT use placeholders. Use:
   - Name: dispute_data['full_name']
   - Address: dispute_data['address']
   - City, State, Zip: dispute_data['city'], dispute_data['state'], dispute_data['zip']
   - Email: dispute_data['email']
   - Phone: dispute_data['phone']
   - Date: Use today's date in a standard business letter format
8. **Documentation Request** - Request for copies of any documentation they have

**IMPORTANT:**
- Do NOT use any placeholders like [Your Name], [Your Address], [Insert ... Here], etc. Use the actual values from the provided fields above.
- If any field is missing, leave it blank, but do NOT use brackets, placeholder, or invented/guessed text.
- Do NOT include a signature line or any placeholder for signature (e.g., '[Your Signature (if sending via mail)]').
- The letter body should be justified and formatted as an official business letter. After 'Sincerely,' there should be two line breaks before the sender's name. The sender's name at the start and end, and the subject/title line, should be plain text only (no asterisks or Markdown).

Format the response as JSON:
{{
    "letter_text": "Complete formatted letter text",
    "subject_line": "Subject line for the letter (plain text, no asterisks)",
    "key_points": ["array of main dispute points"],
    "supporting_documents": ["list of documents to include with the letter"],
    "follow_up_actions": ["array of follow-up steps to take"],
    "estimated_timeline": "Expected timeline for response",
    "next_steps": ["what to do after sending the letter"]
}}"""

        response = openai_client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "Generate a professional dispute letter for this credit item."}
            ],
            max_tokens=2500,
            temperature=0.7
        )
        content = response.choices[0].message.content.strip() if response.choices and response.choices[0].message.content else ""
        if not content:
            print("❌ OpenAI returned empty content for dispute letter")
            raise Exception("OpenAI returned empty content")
        try:
            # Remove triple backticks and optional 'json' after them
            content_clean = re.sub(r'^```json|^```|```$', '', content, flags=re.MULTILINE).strip()
            letter_data = json.loads(content_clean)
            print("=== AI JSON Response ===")
            print(json.dumps(letter_data, indent=2))
            return letter_data
        except Exception as json_err:
            print(f"❌ JSON decode error in dispute letter: {json_err}")
            print(f"❌ Raw content: {content}")
            raise Exception(f"Invalid JSON response from OpenAI: {json_err}")
    except Exception as e:
        print(f"Dispute Letter Generation Error: {e}")
        return {
            "error": "Failed to generate dispute letter",
            "letter_text": "Unable to generate dispute letter at this time."
        }

def create_pdf_from_text(letter_text):
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    lines = letter_text.split('\n')
    y = height - 50  # Start from top
    for line in lines:
        c.drawString(50, y, line)
        y -= 15  # Move down for next line
    c.save()
    buffer.seek(0)
    return buffer

@disputes_bp.route('/', methods=['GET'], strict_slashes=False)
@jwt_required()
@vip_required
def get_disputes():
    user_id = get_jwt_identity()
    print("[DEBUG] Fetching disputes for user_id:", user_id)
    disputes = load_disputes()
    print("[DEBUG] All disputes in file:", disputes)
    user_disputes = [d for d in disputes if d.get('user_id') == user_id]
    print("[DEBUG] User disputes returned:", user_disputes)
    return jsonify(user_disputes)

@disputes_bp.route('/', methods=['POST'], strict_slashes=False)
@jwt_required()
@vip_required
def add_dispute():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        required_fields = ['item', 'reason', 'bureau', 'priority', 'status']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({'error': f'Missing required fields: {missing}'}), 400
        disputes = load_disputes()
        # Fetch user info from Supabase
        user_profile = None
        try:
            user_supabase = get_supabase_from_request()
            user_response = user_supabase.table('users').select('full_name, address, city, state, zip, phone, email').eq('id', user_id).single().execute()
            if user_response.data:
                user_profile = user_response.data
        except Exception as e:
            print('[ERROR] Could not fetch user profile from Supabase:', e)
        # Add current date to the data for the AI
        now_str = datetime.utcnow().strftime('%B %d, %Y')
        letter_input = {**data, **(user_profile or {}), 'date': now_str}
        # Automatically generate AI letter
        letter_data = generate_dispute_letter_ai(letter_input, {})
        new_dispute = {
            'id': len(disputes) + 1,
            'user_id': user_id,
            'crdt_report_id': data.get('crdt_report_id', ''),
            'item': data['item'],
            'reason': data.get('reason', ''),
            'bureau': data.get('bureau', ''),
            'priority': data.get('priority', 'medium'),
            'status': data.get('status', 'pending'),
            'letter_text': letter_data.get('letter_text', ''),
            'letter_subject': letter_data.get('subject_line', ''),
            'letter_data': letter_data,
            'created_at': datetime.utcnow().isoformat(),
            'user_profile': user_profile or {},
        }
        disputes.append(new_dispute)
        save_disputes(disputes)
        return jsonify({'message': 'Dispute added successfully', 'id': new_dispute['id'], 'letter_data': letter_data}), 201
    except Exception as e:
        print('[ERROR] add_dispute exception:', e)
        traceback.print_exc()
        return jsonify({'error': str(e), 'trace': traceback.format_exc()}), 500

@disputes_bp.route('/<int:dispute_id>', methods=['PUT'], strict_slashes=False)
@jwt_required()
@vip_required
def update_dispute(dispute_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        disputes = load_disputes()
        updated = False
        for d in disputes:
            if d.get('id') == dispute_id and d.get('user_id') == user_id:
                for k in ['item', 'reason', 'status', 'priority', 'letter_text', 'letter_subject']:
                    if k in data:
                        d[k] = data[k]
                updated = True
                break
        if updated:
            save_disputes(disputes)
            return jsonify({'message': 'Dispute updated successfully'})
        else:
            return jsonify({'error': 'Dispute not found or not updated'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disputes_bp.route('/<int:dispute_id>', methods=['DELETE'], strict_slashes=False)
@jwt_required()
@vip_required
def delete_dispute(dispute_id):
    user_id = get_jwt_identity()
    try:
        disputes = load_disputes()
        new_disputes = [d for d in disputes if not (d.get('id') == dispute_id and d.get('user_id') == user_id)]
        if len(new_disputes) == len(disputes):
            return jsonify({'error': 'Dispute not found'}), 404
        save_disputes(new_disputes)
        return jsonify({'message': 'Dispute deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disputes_bp.route('/<int:dispute_id>/letter', methods=['POST'], strict_slashes=False)
@jwt_required()
@vip_required
def generate_dispute_letter(dispute_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        disputes = load_disputes()
        dispute = next((d for d in disputes if d.get('id') == dispute_id and d.get('user_id') == user_id), None)
        if not dispute:
            return jsonify({'error': 'Dispute not found'}), 404
        # Get credit context
        credit_context = {}
        if dispute.get('crdt_report_id'):
            user_supabase = get_supabase_from_request()
            reports_response = user_supabase.table('crdt_reports').select('*').eq('id', dispute['crdt_report_id']).execute()
            if reports_response.data:
                credit_context = reports_response.data[0]
        # Generate letter
        letter_data = generate_dispute_letter_ai(dispute, credit_context)
        # Update dispute with new letter
        for d in disputes:
            if d.get('id') == dispute_id and d.get('user_id') == user_id:
                d['letter_text'] = letter_data.get('letter_text', '')
                d['letter_subject'] = letter_data.get('subject_line', '')
                d['letter_data'] = letter_data
                d['updated_at'] = datetime.utcnow().isoformat()
                break
        save_disputes(disputes)
        return jsonify({
            'message': 'Dispute letter generated successfully',
            'letter_data': letter_data
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disputes_bp.route('/bulk-generate', methods=['POST'], strict_slashes=False)
@jwt_required()
@vip_required
def bulk_generate_disputes():
    """Generate multiple disputes from credit analysis opportunities."""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        opportunities = data.get('opportunities', [])
        if not opportunities:
            return jsonify({'error': 'No dispute opportunities provided'}), 400
        
        # Get credit context
        credit_context = {}
        if data.get('crdt_report_id'):
            user_supabase = get_supabase_from_request()
            reports_response = user_supabase.table('crdt_reports').select('*').eq('id', data['crdt_report_id']).execute()
            if reports_response.data:
                credit_context = reports_response.data[0]
        
        generated_disputes = []
        
        for opportunity in opportunities:
            # Generate dispute letter
            letter_data = generate_dispute_letter_ai(opportunity, credit_context)
            
            # Create dispute record
            dispute_data = {
                'user_id': user_id,
                'crdt_report_id': opportunity.get('crdt_report_id'),
                'item': opportunity['item'],
                'reason': opportunity.get('reason', ''),
                'bureau': opportunity.get('bureau', ''),
                'priority': opportunity.get('priority', 'medium'),
                'status': 'pending',
                'letter_text': letter_data.get('letter_text', ''),
                'letter_subject': letter_data.get('subject_line', ''),
                'letter_data': letter_data,
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Insert dispute
            disputes = load_disputes()
            updated_disputes = [d for d in disputes if d.get('id') != len(disputes) + 1]
            updated_disputes.append(dispute_data)
            save_disputes(updated_disputes)
            generated_disputes.append({
                'id': len(updated_disputes),
                'item': opportunity['item'],
                'bureau': opportunity.get('bureau', ''),
                'priority': opportunity.get('priority', 'medium'),
                'letter_generated': bool(letter_data.get('letter_text'))
            })
        
        return jsonify({
            'message': f'Generated {len(generated_disputes)} disputes successfully',
            'disputes': generated_disputes
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@disputes_bp.route('/stats', methods=['GET'], strict_slashes=False)
@jwt_required()
@vip_required
def get_dispute_stats():
    """Get dispute statistics for the user."""
    user_id = get_jwt_identity()
    
    try:
        disputes = load_disputes()
        user_disputes = [d for d in disputes if d.get('user_id') == user_id]
        
        stats = {
            'total': len(user_disputes),
            'pending': len([d for d in user_disputes if d.get('status') == 'pending']),
            'in_progress': len([d for d in user_disputes if d.get('status') == 'in_progress']),
            'resolved': len([d for d in user_disputes if d.get('status') == 'resolved']),
            'rejected': len([d for d in user_disputes if d.get('status') == 'rejected']),
            'by_bureau': {},
            'by_priority': {
                'high': len([d for d in user_disputes if d.get('priority') == 'high']),
                'medium': len([d for d in user_disputes if d.get('priority') == 'medium']),
                'low': len([d for d in user_disputes if d.get('priority') == 'low'])
            }
        }
        
        # Count by bureau
        for dispute in user_disputes:
            bureau = dispute.get('bureau', 'Unknown')
            stats['by_bureau'][bureau] = stats['by_bureau'].get(bureau, 0) + 1
        
        return jsonify(stats)
        
    except Exception as e:
        pass

@disputes_bp.route('/letter-pdf', methods=['POST'])
def get_letter_pdf():
    data = request.json
    letter_text = data.get("letter_text", "")
    if not letter_text:
        return jsonify({"error": "Missing letter_text in request"}), 400
    pdf_buffer = create_pdf_from_text(letter_text)
    return send_file(pdf_buffer, as_attachment=True, download_name="dispute_letter.pdf", mimetype='application/pdf')

@disputes_bp.route('/generate-letter-json', methods=['POST'])
def generate_letter_json():
    data = request.json
    # You may want to add validation here
    letter_data = generate_dispute_letter_ai(data, {})
    return jsonify(letter_data) 