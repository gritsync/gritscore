from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.supabase_client import supabase, get_supabase_from_request
import uuid
from datetime import datetime
import os
from openai import OpenAI
import traceback
from .subscription import basic_required

chat_bp = Blueprint('chat', __name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

def get_user_financial_context(user_id):
    """Fetch comprehensive user financial data for AI context."""
    context = {
        'transactions': [],
        'categories': [],
        'debts': [],
        'crdt_reports': [],
        'crdt_alerts': [],
        'budget_summary': {},
        'user_profile': {}
    }
    
    try:
        user_supabase = get_supabase_from_request()
        # Get user profile
        user_response = user_supabase.table('users').select('*').eq('id', user_id).execute()
        if user_response.data:
            context['user_profile'] = user_response.data[0]
        
        # Get recent transactions (last 3 months)
        from datetime import datetime, timedelta
        three_months_ago = (datetime.utcnow() - timedelta(days=90)).strftime('%Y-%m-%d')
        transactions_response = user_supabase.table('transactions').select('*').eq('user_id', user_id).gte('date', three_months_ago).order('date', desc=True).limit(100).execute()
        if transactions_response.data:
            context['transactions'] = transactions_response.data
        
        # Get categories
        categories_response = user_supabase.table('categories').select('*').eq('user_id', user_id).execute()
        default_categories_response = user_supabase.table('categories').select('*').is_('user_id', 'null').execute()
        context['categories'] = (categories_response.data or []) + (default_categories_response.data or [])
        
        # Get debts
        debts_response = user_supabase.table('debts').select('*').eq('user_id', user_id).execute()
        if debts_response.data:
            context['debts'] = debts_response.data
        
        # Get credit reports
        crdt_reports_response = user_supabase.table('crdt_reports').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(5).execute()
        if crdt_reports_response.data:
            context['crdt_reports'] = crdt_reports_response.data
        
        # Get credit alerts
        crdt_alerts_response = user_supabase.table('crdt_alerts').select('*').eq('user_id', user_id).order('created_at', desc=True).limit(10).execute()
        if crdt_alerts_response.data:
            context['crdt_alerts'] = crdt_alerts_response.data
        
        # Calculate budget summary
        if context['transactions']:
            total_income = sum(t['amount'] for t in context['transactions'] if t.get('amount', 0) > 0)
            total_expenses = sum(abs(t['amount']) for t in context['transactions'] if t.get('amount', 0) < 0)
            context['budget_summary'] = {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'net_income': total_income - total_expenses,
                'transaction_count': len(context['transactions'])
            }
        
    except Exception as e:
        print(f"[Financial Context Error] {e}")
        traceback.print_exc()
    
    return context

@chat_bp.route('/send', methods=['POST'])
@jwt_required()
@basic_required
def send_message():
    """Send a message and get an AI response from GPT-4.1 with full user financial context."""
    data = request.get_json()
    message = data.get('message')
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    user_id = get_jwt_identity()
    timestamp = datetime.utcnow().isoformat()
    print(f"[Chat Send Debug] User ID: {user_id}, Message: {message[:50]}...")
    
    try:
        user_supabase = get_supabase_from_request()
        # Store user message
        user_supabase.table('chat_history').insert({
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'role': 'user',
            'message': message,
            'timestamp': timestamp
        }).execute()
        
        # Get comprehensive user financial context
        financial_context = get_user_financial_context(user_id)
        
        # Call OpenAI GPT-4.1 with enhanced context
        ai_response = None
        try:
            # Check if OpenAI API key is configured
            openai_api_key = os.environ.get('OPENAI_API_KEY')
            if not openai_api_key or openai_api_key == 'your_openai_api_key_here':
                print("[OpenAI API Error] OPENAI_API_KEY not configured")
                ai_response = "I'm currently in setup mode. Please configure the OpenAI API key to enable AI features. Contact support for assistance."
                return jsonify({'response': ai_response}), 200
            
            # Create detailed system prompt with user's financial data
            system_prompt = f"""You are GritScore.ai, a friendly, expert financial and credit assistant with full access to the user's financial data.

=== USER'S FINANCIAL PROFILE ===
{financial_context['user_profile']}

=== FINANCIAL SUMMARY ===
- Total Income (3 months): ${financial_context['budget_summary'].get('total_income', 0):,.2f}
- Total Expenses (3 months): ${financial_context['budget_summary'].get('total_expenses', 0):,.2f}
- Net Income (3 months): ${financial_context['budget_summary'].get('net_income', 0):,.2f}
- Transaction Count: {financial_context['budget_summary'].get('transaction_count', 0)}

=== RECENT TRANSACTIONS (Last 10) ===
{financial_context['transactions'][:10] if financial_context['transactions'] else 'No recent transactions'}

=== BUDGET CATEGORIES ===
{financial_context['categories']}

=== ACTIVE DEBTS ===
{financial_context['debts']}

=== CREDIT REPORTS ===
{financial_context['crdt_reports']}

=== CREDIT ALERTS ===
{financial_context['crdt_alerts']}

=== AI ASSISTANT INSTRUCTIONS ===
You are GritScore.ai, a personalized financial coach with access to the user's complete financial data. Your role is to:

1. **Provide Personalized Advice**: Use their actual financial data to give specific, relevant recommendations
2. **Reference Their Data**: When appropriate, mention specific transactions, spending patterns, or debt amounts
3. **Identify Opportunities**: Point out areas where they can save money, reduce debt, or improve their credit
4. **Be Encouraging**: Support their financial goals while being honest about areas for improvement
5. **Give Actionable Steps**: Provide concrete, specific actions they can take today
6. **Analyze Patterns**: Help them understand their spending habits and financial trends
7. **Maintain Privacy**: Never share sensitive account details or personal information
8. **Answer Questions**: If they ask about their financial situation, provide insights based on their actual data

**Example Responses:**
- "I can see you've spent ${{amount}} on dining out this month. Consider setting a budget of ${{suggested_amount}} to save money."
- "Your credit utilization is {{percentage}}%. To improve your credit score, try to keep it below 30%."
- "You have ${{debt_amount}} in outstanding debt. Here's a debt payoff strategy..."

Remember: You have their real financial data, so provide specific, personalized advice rather than generic recommendations."""

            print(f"[OpenAI Debug] API Key configured: {bool(openai_api_key)}")
            print(f"[OpenAI Debug] Sending request to OpenAI...")
            
            completion = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                max_tokens=2000,
                temperature=0.7
            )
            ai_response = completion.choices[0].message.content.strip()
            print(f"[OpenAI Debug] Response received successfully")
        except Exception as e:
            print(f"[OpenAI API Error] {type(e).__name__}: {e}")
            traceback.print_exc()
            
            # Provide more specific error messages
            if "authentication" in str(e).lower() or "api_key" in str(e).lower():
                ai_response = "I'm having trouble authenticating with the AI service. Please check the API configuration."
            elif "quota" in str(e).lower() or "rate" in str(e).lower():
                ai_response = "The AI service is currently experiencing high demand. Please try again in a few minutes."
            elif "timeout" in str(e).lower() or "connection" in str(e).lower():
                ai_response = "I'm having trouble connecting to the AI service. Please check your internet connection and try again."
            else:
                ai_response = "Sorry, I'm having trouble connecting to GritScore.ai's AI engine right now. Please try again later."
        
        # Store AI message
        user_supabase.table('chat_history').insert({
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'role': 'ai',
            'message': ai_response,
            'timestamp': datetime.utcnow().isoformat()
        }).execute()
        
        return jsonify({'response': ai_response}), 200
    except Exception as e:
        print("[Chat Endpoint Error]", e)
        traceback.print_exc()
        return jsonify({'error': f'Failed to send message: {str(e)}'}), 500

@chat_bp.route('/history', methods=['GET'])
@jwt_required()
@basic_required
def get_chat_history():
    """Get the chat history for the logged-in user."""
    user_id = get_jwt_identity()
    print(f"[Chat History Debug] User ID: {user_id}")
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('chat_history').select('*').eq('user_id', user_id).order('timestamp').execute()
        print(f"[Chat History Debug] Response: {response}")
        history = response.data if response.data else []
        print(f"[Chat History Debug] History length: {len(history)}")
        return jsonify({'history': history}), 200
    except Exception as e:
        print(f"[Chat History Error] {e}")
        traceback.print_exc()
        return jsonify({'error': f'Failed to fetch chat history: {str(e)}'}), 500

@chat_bp.route('/history', methods=['DELETE'])
@jwt_required()
@basic_required
def clear_chat_history():
    """Delete all chat history for the logged-in user."""
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        user_supabase.table('chat_history').delete().eq('user_id', user_id).execute()
        return jsonify({'message': 'Chat history cleared'}), 200
    except Exception as e:
        return jsonify({'error': f'Failed to clear chat history: {str(e)}'}), 500

@chat_bp.route('/financial-summary', methods=['GET'])
@jwt_required()
@basic_required
def get_financial_summary():
    """Get a comprehensive financial summary for AI context."""
    user_id = get_jwt_identity()
    try:
        financial_context = get_user_financial_context(user_id)
        
        # Create a clean summary for the frontend
        summary = {
            'user_profile': financial_context['user_profile'],
            'budget_summary': financial_context['budget_summary'],
            'recent_transactions_count': len(financial_context['transactions']),
            'debts_count': len(financial_context['debts']),
            'crdt_reports_count': len(financial_context['crdt_reports']),
            'crdt_alerts_count': len(financial_context['crdt_alerts']),
            'categories_count': len(financial_context['categories']),
            'has_data': any([
                financial_context['transactions'],
                financial_context['debts'],
                financial_context['crdt_reports']
            ])
        }
        
        return jsonify(summary), 200
    except Exception as e:
        print(f"[Financial Summary Error] {e}")
        traceback.print_exc()
        return jsonify({'error': f'Failed to get financial summary: {str(e)}'}), 500

@chat_bp.route('/test-openai', methods=['GET'])
@jwt_required()
@basic_required
def test_openai():
    """Test OpenAI API connection."""
    try:
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if not openai_api_key or openai_api_key == 'your_openai_api_key_here':
            return jsonify({
                'status': 'error',
                'message': 'OPENAI_API_KEY not configured',
                'configured': False
            }), 400
        
        # Test with a simple request
        completion = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": "Hello, this is a test message."}
            ],
            max_tokens=50
        )
        
        return jsonify({
            'status': 'success',
            'message': 'OpenAI API is working correctly',
            'configured': True,
            'response': completion.choices[0].message.content.strip()
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'OpenAI API test failed: {str(e)}',
            'configured': bool(os.environ.get('OPENAI_API_KEY')),
            'error_type': type(e).__name__
        }), 500 