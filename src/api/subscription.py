from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import stripe
import json
from src.services.supabase_client import supabase, get_supabase_from_request
import functools
from src.services.email_service import email_service
# TODO: Refactor this module to use Supabase client instead of SQLAlchemy.

# Stripe key is set in app.py from environment variables

subscription_bp = Blueprint('subscription', __name__)

# SaaS plans
PLANS = {
    'free': {
        'id': 'price_free',
        'name': 'Free',
        'price': 0,  # $0.00
        'features': ['Budgeting', 'Debt Tracking'],
        'description': 'Free for 1 month'
    },
    'basic': {
        'id': 'price_basic',
        'name': 'Basic',
        'price': 599,  # $5.99
        'features': ['Budgeting', 'Debt Tracking', 'AI Chat'],
        'description': 'Includes AI Chat'
    },
    'premium': {
        'id': 'price_premium',
        'name': 'Premium',
        'price': 999,  # $9.99
        'features': ['Credit Analysis', 'Budgeting', 'Debt Tracking', 'AI Chat'],
        'description': 'Includes Credit Analysis'
    },
    'vip': {
        'id': 'price_vip',
        'name': 'VIP',
        'price': 1999,  # $19.99
        'features': ['Disputes', 'Credit Analysis', 'Budgeting', 'Debt Tracking', 'AI Chat'],
        'description': 'Includes Disputes'
    }
}

class Subscription:
    # Placeholder for Supabase-based implementation
    pass

@subscription_bp.route('/plans', methods=['GET'])
def get_plans():
    return jsonify(list(PLANS.values()))

@subscription_bp.route('/current', methods=['GET'])
@jwt_required()
def get_current_subscription():
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('users').select('subscription_plan').eq('id', user_id).single().execute()
        if response.data and response.data.get('subscription_plan'):
            plan = response.data['subscription_plan']
            return jsonify({'plan': plan, 'status': 'active'})
        else:
            return jsonify({'plan': 'Free', 'status': 'active'})
    except Exception as e:
        print(f"[DEBUG] get_current_subscription error: {e}")
        return jsonify({'plan': 'Free', 'status': 'active'})

@subscription_bp.route('/checkout', methods=['POST'])
@jwt_required()
def create_checkout_session():
    print('DEBUG: Stripe API key at checkout:', stripe.api_key[:8] + '...' if stripe.api_key else 'None')
    data = request.get_json()
    plan_id = data.get('planId')
    
    if plan_id not in PLANS:
        return jsonify({'error': 'Invalid plan'}), 400
    
    plan = PLANS[plan_id]
    
    try:
        # Add more detailed logging
        print(f"Creating checkout session for plan: {plan_id}")
        print(f"Plan details: {plan}")
        
        # Get the current domain from environment or request
        current_domain = current_app.config.get('APP_URL', 'https://gritscore.vercel.app')
        
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': f'GritScore.ai {plan["name"]} Plan',
                        'description': f'{plan["description"]} - {", ".join(plan["features"])}',
                    },
                    'unit_amount': plan['price'],
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{current_domain}/payment-success?success=true&plan={plan_id}',
            cancel_url=f'{current_domain}/payment-success?canceled=true',
            metadata={
                'plan_id': plan_id,
                'plan_name': plan['name']
            },
            # Add customer email if available
            customer_email=request.json.get('email'),
            # Add billing address collection
            billing_address_collection='auto',
            # Add shipping address collection if needed
            shipping_address_collection={
                'allowed_countries': ['US', 'CA'],
            },
        )
        
        print(f"Checkout session created successfully: {checkout_session.id}")
        return jsonify({'id': checkout_session.id})
    except stripe.error.StripeError as e:
        print(f"Stripe error: {e}")
        return jsonify({'error': f'Stripe error: {str(e)}'}), 400
    except Exception as e:
        print(f"General error: {e}")
        return jsonify({'error': str(e)}), 400

@subscription_bp.route('/subscribe', methods=['POST'])
@jwt_required()
def subscribe():
    user_id = get_jwt_identity()
    data = request.get_json()
    plan = data.get('plan')
    status = 'active'
    try:
        insert_data = {
            'user_id': user_id,
            'plan': plan,
            'status': status
        }
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('subscriptions').insert(insert_data).execute()
        if response.data:
            return jsonify({'message': 'Subscription created', 'id': response.data[0]['id']}), 201
        else:
            return jsonify({'error': 'Failed to create subscription'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@subscription_bp.route('/cancel', methods=['POST'])
@jwt_required()
def cancel_subscription():
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('subscriptions').update({'status': 'cancelled'}).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Subscription cancelled successfully'})
        else:
            return jsonify({'error': 'No active subscription found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def get_user_plan(user_id):
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('users').select('subscription_plan').eq('id', user_id).single().execute()
        plan = response.data['subscription_plan'] if response.data and response.data.get('subscription_plan') else 'free'
        print(f"[DEBUG] get_user_plan: user_id={user_id}, plan={plan}")
        return plan
    except Exception as e:
        print(f"[DEBUG] get_user_plan: user_id={user_id}, EXCEPTION: {e}")
        return 'free'

def free_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # All users have access
        return f(*args, **kwargs)
    return decorated_function

def basic_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        plan = get_user_plan(user_id)
        if plan in ['basic', 'premium', 'vip']:
            return f(*args, **kwargs)
        return jsonify({'error': 'Basic plan required. Please upgrade.'}), 403
    return decorated_function

def premium_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        plan = get_user_plan(user_id)
        print(f"[DEBUG] premium_required: user_id={user_id}, plan={plan}")
        if plan in ['premium', 'vip']:
            return f(*args, **kwargs)
        return jsonify({'error': 'Premium plan required. Please upgrade.'}), 403
    return decorated_function

def vip_required(f):
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        plan = get_user_plan(user_id)
        if plan == 'vip':
            return f(*args, **kwargs)
        return jsonify({'error': 'VIP plan required. Please upgrade.'}), 403
    return decorated_function

@subscription_bp.route('/update-plan', methods=['POST'])
@jwt_required()
def update_plan():
    """Manual endpoint to update user plan for testing"""
    user_id = get_jwt_identity()
    data = request.get_json()
    plan = data.get('plan')
    
    if not plan or plan not in PLANS:
        return jsonify({'error': 'Invalid plan'}), 400
    
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('users').update({'subscription_plan': plan}).eq('id', user_id).execute()
        print(f"Manually updated user {user_id} to plan {plan}")
        return jsonify({'message': f'Updated to {plan} plan'})
    except Exception as e:
        print(f"Failed to update plan: {e}")
        return jsonify({'error': str(e)}), 500

@subscription_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    payload = request.data
    sig_header = request.headers.get('stripe-signature')
    
    # For development, we'll skip webhook signature verification
    # In production, you should set STRIPE_WEBHOOK_SECRET
    endpoint_secret = current_app.config.get('STRIPE_WEBHOOK_SECRET')
    
    event = None
    try:
        if endpoint_secret:
            event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        else:
            # For development, parse the event without signature verification
            event = json.loads(payload)
    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'error': str(e)}), 400

    print(f"Webhook received: {event['type']}")

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get('customer_email')
        print(f"Payment completed for email: {customer_email}")
        
        # Determine plan from the session
        plan_name = None
        try:
            # Get the line items to determine the plan
            checkout_session = stripe.checkout.Session.retrieve(session['id'], expand=['line_items'])
            line_items = checkout_session['line_items']['data']
            print(f"Line items: {line_items}")
            
            if line_items:
                product_name = line_items[0]['description'] if 'description' in line_items[0] else line_items[0]['price']['product']
                print(f"Product name: {product_name}")
                
                # Map product_name to plan_name
                for key, plan in PLANS.items():
                    if plan['name'].lower() in str(product_name).lower():
                        plan_name = key  # Use the key (basic, premium, vip) instead of name
                        break
                
                print(f"Determined plan: {plan_name}")
            
            if customer_email and plan_name:
                # Update the user's subscription_plan in Supabase
                user_supabase = get_supabase_from_request()
                response = user_supabase.table('users').update({'subscription_plan': plan_name}).eq('email', customer_email).execute()
                print(f"Updated {customer_email} to plan {plan_name}")
                # Send payment confirmation email via Mailjet
                plan = PLANS.get(plan_name, {})
                email_service.send_payment_confirmation(
                    customer_email,
                    customer_email.split('@')[0],
                    plan.get('price', 0) / 100.0,
                    plan.get('name', plan_name)
                )
                # Also create a record in the subscriptions table for tracking
                try:
                    user_response = user_supabase.table('users').select('id').eq('email', customer_email).single().execute()
                    if user_response.data:
                        user_id = user_response.data['id']
                        subscription_data = {
                            'user_id': user_id,
                            'plan': plan_name,
                            'status': 'active',
                            'stripe_session_id': session['id']
                        }
                        user_supabase.table('subscriptions').insert(subscription_data).execute()
                        print(f"Created subscription record for user {user_id}")
                except Exception as sub_e:
                    print(f"Failed to create subscription record: {sub_e}")
            else:
                print(f"Missing customer_email or plan_name: email={customer_email}, plan={plan_name}")
        except Exception as e:
            print(f"Failed to update user after Stripe payment: {e}")
    
    return '', 200 