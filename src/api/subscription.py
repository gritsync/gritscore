from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
import stripe
import json
from src.services.supabase_client import supabase, get_supabase_from_request
import functools
from src.services.email_service import email_service
from src.services.subscription_manager import SubscriptionManager
from datetime import datetime, timedelta
# TODO: Refactor this module to use Supabase client instead of SQLAlchemy.

# Stripe key is set in app.py from environment variables

subscription_bp = Blueprint('subscription', __name__)

# Updated SaaS plans with new pricing and billing periods
PLANS = {
    'free': {
        'id': 'price_free',
        'name': 'Free',
        'price': 0,  # $0.00
        'billing_period': '3_months',  # 3 months only
        'features': ['Budgeting', 'Debt Tracking'],
        'description': 'Free for 3 months only',
        'auto_renew': False
    },
    'basic': {
        'id': 'price_basic_monthly',
        'name': 'Basic',
        'price': 299,  # $2.99
        'billing_period': 'monthly',
        'features': ['Budgeting', 'Debt Tracking', 'AI Chat'],
        'description': 'Includes AI Chat - Monthly billing',
        'auto_renew': True
    },
    'premium': {
        'id': 'price_premium_6months',
        'name': 'Premium',
        'price': 5994,  # $59.94 for 6 months ($9.99/month)
        'billing_period': '6_months',
        'features': ['Credit Analysis', 'Budgeting', 'Debt Tracking', 'AI Chat'],
        'description': 'Includes Credit Analysis - 6-month billing',
        'auto_renew': True
    },
    'vip': {
        'id': 'price_vip_12months',
        'name': 'VIP',
        'price': 23988,  # $239.88 for 12 months ($19.99/month)
        'billing_period': '12_months',
        'features': ['Disputes', 'Credit Analysis', 'Budgeting', 'Debt Tracking', 'AI Chat'],
        'description': 'Includes Disputes - 12-month billing',
        'auto_renew': True
    }
}

# Plan upgrade mapping for advertisements
PLAN_UPGRADE_MAP = {
    'free': 'basic',
    'basic': 'premium',
    'premium': 'vip',
    'vip': None  # No advertisement for VIP users
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
        # Use subscription manager to get detailed status
        status = SubscriptionManager.get_subscription_status(user_id)
        if status:
            return jsonify({
                'plan': status['plan'],
                'status': status['status'],
                'is_expired': status['is_expired'],
                'data_archived': status['data_archived'],
                'days_remaining': status['days_remaining'],
                'start_date': status['start_date'],
                'end_date': status['end_date']
            })
        else:
            return jsonify({'plan': 'free', 'status': 'active'})
    except Exception as e:
        print(f"[DEBUG] get_current_subscription error: {e}")
        return jsonify({'plan': 'free', 'status': 'active'})

@subscription_bp.route('/upgrade-suggestion', methods=['GET'])
@jwt_required()
def get_upgrade_suggestion():
    """Get the suggested upgrade plan for the current user"""
    user_id = get_jwt_identity()
    try:
        status = SubscriptionManager.get_subscription_status(user_id)
        current_plan = status['plan'] if status else 'free'
        
        suggested_plan = PLAN_UPGRADE_MAP.get(current_plan)
        if suggested_plan:
            return jsonify({
                'current_plan': current_plan,
                'suggested_plan': suggested_plan,
                'suggested_plan_details': PLANS.get(suggested_plan, {}),
                'is_expired': status.get('is_expired', False) if status else False,
                'data_archived': status.get('data_archived', False) if status else False
            })
        else:
            return jsonify({
                'current_plan': current_plan,
                'suggested_plan': None,
                'message': 'You are already on the highest tier!'
            })
    except Exception as e:
        print(f"[DEBUG] get_upgrade_suggestion error: {e}")
        return jsonify({'error': 'Failed to get upgrade suggestion'}), 500

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
        
        # Determine if this should be a subscription or one-time payment
        if plan_id == 'free':
            # Free plan - just update user plan
            user_id = get_jwt_identity()
            user_supabase = get_supabase_from_request()
            
            # Set 3-month trial period
            start_date = datetime.utcnow()
            end_date = start_date + timedelta(days=90)  # 3 months
            
            response = user_supabase.table('users').update({
                'subscription_plan': plan_id,
                'subscription_start_date': start_date.isoformat(),
                'subscription_end_date': end_date.isoformat()
            }).eq('id', user_id).execute()
            
            return jsonify({'success': True, 'message': 'Free plan activated for 3 months'})
        
        # For paid plans, create Stripe checkout session
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
            mode='subscription' if plan['auto_renew'] else 'payment',
            success_url=f'{current_domain}/payment-success?success=true&plan={plan_id}',
            cancel_url=f'{current_domain}/payment-success?canceled=true',
            metadata={
                'plan_id': plan_id,
                'plan_name': plan['name'],
                'billing_period': plan['billing_period'],
                'auto_renew': str(plan['auto_renew'])
            },
            # Add customer email if available
            customer_email=request.json.get('email'),
            # Add billing address collection
            billing_address_collection='auto',
            # Add shipping address collection if needed
            shipping_address_collection={
                'allowed_countries': ['US', 'CA'],
            },
            # For subscriptions, add subscription data
            subscription_data={
                'metadata': {
                    'plan_id': plan_id,
                    'plan_name': plan['name'],
                    'billing_period': plan['billing_period']
                }
            } if plan['auto_renew'] else None,
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
        status = SubscriptionManager.get_subscription_status(user_id)
        plan = status['plan'] if status else 'free'
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
        
        # Set subscription dates based on plan
        start_date = datetime.utcnow()
        if plan == 'free':
            end_date = start_date + timedelta(days=90)  # 3 months
        elif plan == 'basic':
            end_date = start_date + timedelta(days=30)  # 1 month
        elif plan == 'premium':
            end_date = start_date + timedelta(days=180)  # 6 months
        elif plan == 'vip':
            end_date = start_date + timedelta(days=365)  # 12 months
        else:
            end_date = start_date
        
        # Check if user had archived data and restore it
        status = SubscriptionManager.get_subscription_status(user_id)
        if status and status.get('data_archived'):
            SubscriptionManager.restore_user_data(user_id)
        
        response = user_supabase.table('users').update({
            'subscription_plan': plan,
            'subscription_start_date': start_date.isoformat(),
            'subscription_end_date': end_date.isoformat()
        }).eq('id', user_id).execute()
        
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
                
                # Set subscription dates based on plan
                start_date = datetime.utcnow()
                if plan_name == 'basic':
                    end_date = start_date + timedelta(days=30)  # 1 month
                elif plan_name == 'premium':
                    end_date = start_date + timedelta(days=180)  # 6 months
                elif plan_name == 'vip':
                    end_date = start_date + timedelta(days=365)  # 12 months
                else:
                    end_date = start_date
                
                # Get user ID first
                user_response = user_supabase.table('users').select('id').eq('email', customer_email).single().execute()
                if user_response.data:
                    user_id = user_response.data['id']
                    
                    # Check if user had archived data and restore it
                    status = SubscriptionManager.get_subscription_status(user_id)
                    if status and status.get('data_archived'):
                        SubscriptionManager.restore_user_data(user_id)
                
                response = user_supabase.table('users').update({
                    'subscription_plan': plan_name,
                    'subscription_start_date': start_date.isoformat(),
                    'subscription_end_date': end_date.isoformat()
                }).eq('email', customer_email).execute()
                
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
                            'stripe_session_id': session['id'],
                            'start_date': start_date.isoformat(),
                            'end_date': end_date.isoformat()
                        }
                        user_supabase.table('subscriptions').insert(subscription_data).execute()
                        print(f"Created subscription record for user {user_id}")
                except Exception as sub_e:
                    print(f"Failed to create subscription record: {sub_e}")
            else:
                print(f"Missing customer_email or plan_name: email={customer_email}, plan={plan_name}")
        except Exception as e:
            print(f"Failed to update user after Stripe payment: {e}")
    
    elif event['type'] == 'invoice.payment_succeeded':
        # Handle subscription renewals
        invoice = event['data']['object']
        customer_email = invoice.get('customer_email')
        subscription_id = invoice.get('subscription')
        
        if customer_email and subscription_id:
            try:
                # Get subscription details from Stripe
                subscription = stripe.Subscription.retrieve(subscription_id)
                plan_name = subscription.metadata.get('plan_id')
                
                if plan_name and plan_name in PLANS:
                    user_supabase = get_supabase_from_request()
                    
                    # Update subscription end date
                    start_date = datetime.utcnow()
                    if plan_name == 'basic':
                        end_date = start_date + timedelta(days=30)
                    elif plan_name == 'premium':
                        end_date = start_date + timedelta(days=180)
                    elif plan_name == 'vip':
                        end_date = start_date + timedelta(days=365)
                    else:
                        end_date = start_date
                    
                    response = user_supabase.table('users').update({
                        'subscription_end_date': end_date.isoformat()
                    }).eq('email', customer_email).execute()
                    
                    print(f"Renewed subscription for {customer_email} - plan {plan_name}")
            except Exception as e:
                print(f"Failed to process subscription renewal: {e}")
    
    return '', 200 