from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from werkzeug.security import generate_password_hash, check_password_hash
import uuid
from src.services.email_service import email_service
from src.services.supabase_client import supabase, get_supabase_from_request
import jwt
from datetime import datetime, timedelta

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name', '')
    middle_name = data.get('middle_name', '')
    last_name = data.get('last_name', '')
    
    if not email or not password:
        return jsonify({'message': 'Missing required fields'}), 400

    # Check if user exists - use base client for public operations
    try:
        response = supabase.table('users').select('*').eq('email', email).single().execute()
        if response.data:
            return jsonify({'message': 'User already exists'}), 409
    except Exception:
        pass

    user_id = str(uuid.uuid4())
    password_hash = generate_password_hash(password)
    
    # Create full name and preferred name
    name_parts = [first_name, middle_name, last_name]
    full_name = ' '.join([part for part in name_parts if part.strip()])
    preferred_name = f"{first_name} {last_name}".strip()
    
    # Set subscription dates for free plan (3 months)
    subscription_start = datetime.utcnow()
    subscription_end = subscription_start + timedelta(days=90)  # 3 months
    
    insert_data = {
        'id': user_id,
        'email': email,
        'first_name': first_name,
        'middle_name': middle_name,
        'last_name': last_name,
        'full_name': full_name,
        'preferred_name': preferred_name,
        'password_hash': password_hash,
        'subscription_plan': 'free',
        'subscription_start_date': subscription_start.isoformat(),
        'subscription_end_date': subscription_end.isoformat(),
        'email_verified': False
    }
    try:
        # Use base client for user registration (this should be allowed by RLS)
        supabase.table('users').insert(insert_data).execute()
        # Generate a verification link (for demo, just a dummy link with user_id)
        verification_link = f"{current_app.config.get('APP_URL', 'https://gritscore.vercel.app')}/verify-email?uid={user_id}"
        # Send verification email via Mailjet
        email_service.send_verification_email(email, preferred_name or full_name or email, verification_link)
        # Send welcome email via Mailjet
        email_service.send_welcome_email(email, preferred_name or full_name or email)
        access_token = create_access_token(identity=user_id, additional_claims={'subscription_plan': insert_data.get('subscription_plan', 'Free')})
        return jsonify({
            'message': 'Registration successful! Please check your email to verify your account.',
            'token': access_token,
            'user': {
                'id': user_id,
                'email': email,
                'first_name': first_name,
                'middle_name': middle_name,
                'last_name': last_name,
                'full_name': full_name,
                'preferred_name': preferred_name,
                'subscription': {'plan': 'Free'}
            }
        }), 201
    except Exception as e:
        return jsonify({'message': f'Failed to register: {str(e)}'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    try:
        # Use base client for login (this should be allowed by RLS)
        response = supabase.table('users').select('*').eq('email', email).single().execute()
        user = response.data
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Invalid credentials'}), 401
        access_token = create_access_token(identity=user['id'], additional_claims={'subscription_plan': user.get('subscription_plan', 'Free')})
        print("=== LOGIN DEBUG ===")
        print("User ID:", user['id'])
        print("Access Token:", access_token[:50] + "..." if len(access_token) > 50 else access_token)
        return jsonify({
            'token': access_token,
            'user': {
                'id': user['id'],
                'email': email,
                'first_name': user.get('first_name', ''),
                'middle_name': user.get('middle_name', ''),
                'last_name': user.get('last_name', ''),
                'full_name': user.get('full_name', ''),
                'preferred_name': user.get('preferred_name', ''),
                'subscription': {'plan': user.get('subscription_plan', 'Free')}
            }
        }), 200
    except Exception as e:
        return jsonify({'message': f'Login failed: {str(e)}'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    try:
        # Use authenticated client with JWT from request
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('users').select('*').eq('id', user_id).single().execute()
        
        user = response.data
        if not user:
            return jsonify({'message': 'User not found'}), 404
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'first_name': user.get('first_name', ''),
            'middle_name': user.get('middle_name', ''),
            'last_name': user.get('last_name', ''),
            'full_name': user.get('full_name', ''),
            'preferred_name': user.get('preferred_name', ''),
            'subscription_plan': user.get('subscription_plan', 'Free'),
            'created_at': user.get('created_at'),
            'phone': user.get('phone', ''),
            'address': user.get('address', ''),
            'city': user.get('city', ''),
            'state': user.get('state', ''),
            'zip': user.get('zip', '')
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to fetch user: {str(e)}'}), 500

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        # Handle name fields
        update_data = {}
        if 'first_name' in data or 'middle_name' in data or 'last_name' in data:
            first_name = data.get('first_name', '')
            middle_name = data.get('middle_name', '')
            last_name = data.get('last_name', '')
            name_parts = [first_name, middle_name, last_name]
            full_name = ' '.join([part for part in name_parts if part.strip()])
            preferred_name = f"{first_name} {last_name}".strip()
            update_data.update({
                'first_name': first_name,
                'middle_name': middle_name,
                'last_name': last_name,
                'full_name': full_name,
                'preferred_name': preferred_name
            })
        
        # Handle other fields
        if 'subscription_plan' in data:
            update_data['subscription_plan'] = data['subscription_plan']
        
        if 'address' in data:
            update_data['address'] = data['address']
        if 'city' in data:
            update_data['city'] = data['city']
        if 'state' in data:
            update_data['state'] = data['state']
        if 'zip' in data:
            update_data['zip'] = data['zip']
        if 'phone' in data:
            update_data['phone'] = data['phone']
        
        # Use authenticated client with JWT from request
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('users').update(update_data).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'message': 'User not found'}), 404
        user = response.data[0]
        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'first_name': user.get('first_name', ''),
            'middle_name': user.get('middle_name', ''),
            'last_name': user.get('last_name', ''),
            'full_name': user.get('full_name', ''),
            'preferred_name': user.get('preferred_name', ''),
            'subscription_plan': user.get('subscription_plan', 'Free'),
            'created_at': user.get('created_at'),
            'phone': user.get('phone', ''),
            'address': user.get('address', ''),
            'city': user.get('city', ''),
            'state': user.get('state', ''),
            'zip': user.get('zip', '')
        }), 200
    except Exception as e:
        return jsonify({'message': f'Failed to update user: {str(e)}'}), 500

@auth_bp.route('/test-jwt', methods=['GET'])
@jwt_required()
def test_jwt():
    email = get_jwt_identity()
    return jsonify({
        'message': 'JWT is working!',
        'email': email,
        'type': type(email).__name__
    }), 200

@auth_bp.route('/debug-token', methods=['POST'])
def debug_token():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    try:
        response = supabase.table('users').select('*').eq('email', email).single().execute()
        user = response.data
        if not user or not check_password_hash(user['password_hash'], password):
            return jsonify({'message': 'Invalid credentials'}), 401
        access_token = create_access_token(identity=email)
        
        # Decode the token to see its structure
        decoded = jwt.decode(access_token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        
        return jsonify({
            'token': access_token,
            'decoded': decoded,
            'token_length': len(access_token),
            'has_exp': 'exp' in decoded,
            'identity': decoded.get('sub') or decoded.get('identity')
        }), 200
    except Exception as e:
        return jsonify({'message': f'Debug failed: {str(e)}'}), 500

@auth_bp.route('/test-jwt-protected', methods=['GET'])
@jwt_required()
def test_jwt_protected():
    email = get_jwt_identity()
    return jsonify({
        'message': 'JWT protected endpoint working!',
        'email': email,
        'headers': dict(request.headers)
    }), 200

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    try:
        response = supabase.table('users').select('*').eq('email', email).single().execute()
        user = response.data
        if not user:
            return jsonify({'message': 'No user found with that email'}), 404
        # Generate a reset link (for demo, just a dummy link with user_id)
        reset_link = f"{current_app.config.get('APP_URL', 'https://gritscore.vercel.app')}/reset-password?uid={user['id']}"
        # Send password reset email via Mailjet
        email_service.send_password_reset(email, user.get('preferred_name') or user.get('full_name') or email, reset_link)
        return jsonify({'message': 'Password reset email sent. Please check your inbox.'}), 200
    except Exception as e:
        return jsonify({'message': f'Failed to send password reset email: {str(e)}'}), 500

@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json()
    token = data.get('token')  # This is actually the user_id in our simple implementation
    
    if not token:
        return jsonify({'message': 'Verification token is required'}), 400
    
    try:
        # In our simple implementation, the token is the user_id
        user_id = token
        
        # Update user's email_verified status
        response = supabase.table('users').update({'email_verified': True}).eq('id', user_id).execute()
        
        if not response.data:
            return jsonify({'message': 'Invalid verification token'}), 400
        
        user = response.data[0]
        
        # Create access token for automatic login
        access_token = create_access_token(identity=user['id'], additional_claims={'subscription_plan': user.get('subscription_plan', 'Free')})
        
        return jsonify({
            'message': 'Email verified successfully!',
            'token': access_token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user.get('first_name', ''),
                'middle_name': user.get('middle_name', ''),
                'last_name': user.get('last_name', ''),
                'full_name': user.get('full_name', ''),
                'preferred_name': user.get('preferred_name', ''),
                'subscription': {'plan': user.get('subscription_plan', 'Free')}
            }
        }), 200
        
    except Exception as e:
        return jsonify({'message': f'Verification failed: {str(e)}'}), 500

@auth_bp.route('/resend-verification', methods=['POST'])
def resend_verification():
    data = request.get_json()
    email = data.get('email')
    
    if not email:
        return jsonify({'message': 'Email is required'}), 400
    
    try:
        # Find user by email
        response = supabase.table('users').select('*').eq('email', email).single().execute()
        user = response.data
        
        if not user:
            return jsonify({'message': 'No user found with that email'}), 404
        
        if user.get('email_verified'):
            return jsonify({'message': 'Email is already verified'}), 400
        
        # Generate verification link
        verification_link = f"{current_app.config.get('APP_URL', 'https://gritscore.vercel.app')}/verify-email?uid={user['id']}"
        
        # Send verification email
        email_service.send_verification_email(
            email, 
            user.get('preferred_name') or user.get('full_name') or email, 
            verification_link
        )
        
        return jsonify({'message': 'Verification email sent successfully'}), 200
        
    except Exception as e:
        return jsonify({'message': f'Failed to resend verification email: {str(e)}'}), 500 