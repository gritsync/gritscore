from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from src.services.supabase_client import supabase, get_supabase_from_request
from datetime import datetime
import csv
from io import StringIO
from dateutil.relativedelta import relativedelta
from .subscription import free_required

budget_bp = Blueprint('budget', __name__)

# Get all transactions for the logged-in user
@budget_bp.route('/transactions', methods=['GET'])
@jwt_required()
@free_required
def get_transactions():
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        query = user_supabase.table('transactions').select('*').eq('user_id', user_id)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category_id = request.args.get('category_id')
        min_amount = request.args.get('min_amount')
        max_amount = request.args.get('max_amount')
        search = request.args.get('search')
        if start_date:
            query = query.gte('date', start_date)
        if end_date:
            query = query.lte('date', end_date)
        if category_id:
            query = query.eq('category_id', category_id)
        if min_amount:
            query = query.gte('amount', float(min_amount))
        if max_amount:
            query = query.lte('amount', float(max_amount))
        if search:
            query = query.ilike('description', f'%{search}%')
        response = query.execute()
        transactions = response.data or []
        # --- Recurring logic ---
        now = datetime.utcnow()
        new_transactions = []
        for t in transactions:
            if t.get('recurrence') in ['weekly', 'monthly']:
                last_date = datetime.strptime(t['date'], '%Y-%m-%d')
                # Determine next date
                if t['recurrence'] == 'weekly':
                    # Infer day of week from date since day_of_week column doesn't exist
                    day_of_week = last_date.strftime('%A')
                    # Find next occurrence of this day
                    days_ahead = (list(['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']).index(day_of_week) - last_date.weekday() + 7) % 7
                    if days_ahead == 0:
                        days_ahead = 7
                    next_date = last_date + relativedelta(days=days_ahead)
                elif t['recurrence'] == 'monthly':
                    # Use same day of month
                    next_date = last_date + relativedelta(months=1)
                # Check if next instance exists
                exists = any(
                    tx['description'] == t['description'] and
                    tx['category_id'] == t['category_id'] and
                    tx['recurrence'] == t['recurrence'] and
                    tx['date'] == next_date.strftime('%Y-%m-%d')
                    for tx in transactions
                )
                if not exists:
                    # Only create if previous instance wasn't deleted
                    insert_data = {k: v for k, v in t.items() if k not in ['id', 'date']}
                    insert_data['date'] = next_date.strftime('%Y-%m-%d')
                    # Insert and add to list
                    try:
                        ins_resp = user_supabase.table('transactions').insert(insert_data).execute()
                        if ins_resp.data:
                            new_transactions.append(ins_resp.data[0])
                    except Exception as e:
                        print(f"Error auto-creating recurring transaction: {e}")
        # Re-query to get the updated list
        if new_transactions:
            response = query.execute()
            transactions = response.data or []
        for t in transactions:
            if 'date' in t and t['date']:
                t['date'] = str(t['date'])
        return jsonify(transactions)
    except Exception as e:
        # Return mock data if table doesn't exist
        print(f"Supabase error for transactions: {e}")
        mock_transactions = [
            {
                'id': 1,
                'user_id': user_id,
                'category_id': 1,
                'amount': 45.50,
                'date': '2024-01-15',
                'description': 'Lunch at Chipotle',
                'recurrence': None,
                'status': 'paid'
            },
            {
                'id': 2,
                'user_id': user_id,
                'category_id': 2,
                'amount': 35.00,
                'date': '2024-01-14',
                'description': 'Uber ride',
                'recurrence': None,
                'status': 'paid'
            },
            {
                'id': 3,
                'user_id': user_id,
                'category_id': 4,
                'amount': 5000.00,
                'date': '2024-01-01',
                'description': 'Monthly salary',
                'recurrence': 'monthly',
                'status': 'paid'
            }
        ]
        return jsonify(mock_transactions)

# Get all categories for the logged-in user
@budget_bp.route('/categories', methods=['GET'])
@jwt_required()
@free_required
def get_categories():
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        # Fetch both user categories and default categories (where user_id is null)
        user_response = user_supabase.table('categories').select('*').eq('user_id', user_id).execute()
        default_response = user_supabase.table('categories').select('*').is_('user_id', 'null').execute()
        
        user_categories = user_response.data or []
        default_categories = default_response.data or []
        
        # Combine both lists
        all_categories = user_categories + default_categories
        return jsonify(all_categories)
    except Exception as e:
        # Return mock data if table doesn't exist
        print(f"Supabase error for categories: {e}")
        mock_categories = [
            {
                'id': 1,
                'user_id': user_id,
                'name': 'Food & Dining',
                'type': 'expense',
                'color': '#FF6B6B'
            },
            {
                'id': 2,
                'user_id': user_id,
                'name': 'Transportation',
                'type': 'expense',
                'color': '#4ECDC4'
            },
            {
                'id': 3,
                'user_id': user_id,
                'name': 'Entertainment',
                'type': 'expense',
                'color': '#45B7D1'
            },
            {
                'id': 19,
                'user_id': user_id,
                'name': 'Debt Payments',
                'type': 'expense',
                'color': '#FF1493'
            },
            {
                'id': 4,
                'user_id': user_id,
                'name': 'Salary',
                'type': 'income',
                'color': '#96CEB4'
            }
        ]
        return jsonify(mock_categories)

# Add a new transaction
@budget_bp.route('/transactions', methods=['POST'])
@jwt_required()
@free_required
def add_transaction():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    print(f"=== ADD TRANSACTION DEBUG ===")
    print(f"User ID: {user_id}")
    print(f"Received data: {data}")
    
    try:
        insert_data = {
            'user_id': user_id,
            'category_id': data['category_id'],
            'amount': data['amount'],
            'date': data['date'],
            'description': data.get('description', ''),
            'recurrence': data.get('recurrence')
        }
        
        # Only add status if it's provided in the request
        if 'status' in data:
            insert_data['status'] = data['status']
        
        print(f"Insert data: {insert_data}")
        
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('transactions').insert(insert_data).execute()
        print(f"Supabase response: {response}")
        
        if response.data:
            return jsonify({'message': 'Transaction added', 'id': response.data[0]['id']}), 201
        else:
            return jsonify({'error': 'Failed to add transaction'}), 400
    except Exception as e:
        print(f"Error adding transaction: {e}")
        return jsonify({'error': str(e)}), 500

# Update a transaction
@budget_bp.route('/transactions/<transaction_id>', methods=['PUT'])
@jwt_required()
@free_required
def update_transaction(transaction_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        update_data = {k: v for k, v in data.items() if k in ['amount', 'date', 'category_id', 'description', 'recurrence', 'status']}
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('transactions').update(update_data).eq('id', transaction_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Transaction updated'})
        else:
            return jsonify({'error': 'Transaction not found or not updated'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete a transaction
@budget_bp.route('/transactions/<transaction_id>', methods=['DELETE'])
@jwt_required()
@free_required
def delete_transaction(transaction_id):
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('transactions').delete().eq('id', transaction_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Transaction deleted'})
        else:
            return jsonify({'error': 'Transaction not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Add a new category
@budget_bp.route('/categories', methods=['POST'])
@jwt_required()
@free_required
def add_category():
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        insert_data = {
            'user_id': user_id,
            'name': data['name'],
            'type': data['type'],
            'color': data.get('color')
        }
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('categories').insert(insert_data).execute()
        if response.data:
            return jsonify({'message': 'Category added', 'id': response.data[0]['id']}), 201
        else:
            return jsonify({'error': 'Failed to add category'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update a category
@budget_bp.route('/categories/<int:category_id>', methods=['PUT'])
@jwt_required()
@free_required
def update_category(category_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        update_data = {k: v for k, v in data.items() if k in ['name', 'type', 'color']}
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('categories').update(update_data).eq('id', category_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Category updated'})
        else:
            return jsonify({'error': 'Category not found or not updated'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Delete a category
@budget_bp.route('/categories/<int:category_id>', methods=['DELETE'])
@jwt_required()
@free_required
def delete_category(category_id):
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        response = user_supabase.table('categories').delete().eq('id', category_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Category deleted'})
        else:
            return jsonify({'error': 'Category not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/summary', methods=['GET'])
@jwt_required()
@free_required
def get_summary():
    user_id = get_jwt_identity()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    try:
        user_supabase = get_supabase_from_request()
        # Build base query
        query = user_supabase.table('transactions').select('amount, date, category_id')
        query = query.eq('user_id', user_id)
        if start_date:
            query = query.gte('date', start_date)
        if end_date:
            query = query.lte('date', end_date)
        tx_response = query.execute()
        transactions = tx_response.data or []
        # Fetch categories to get type and name
        cat_response = user_supabase.table('categories').select('id, name, type').eq('user_id', user_id).execute()
        categories = {c['id']: c for c in (cat_response.data or [])}
    except Exception as e:
        # Use mock data if Supabase fails
        print(f"Supabase error for summary: {e}")
        transactions = [
            {'amount': 45.50, 'date': '2024-01-15', 'category_id': 1},
            {'amount': 35.00, 'date': '2024-01-14', 'category_id': 2},
            {'amount': 5000.00, 'date': '2024-01-01', 'category_id': 4}
        ]
        categories = {
            1: {'id': 1, 'name': 'Food & Dining', 'type': 'expense'},
            2: {'id': 2, 'name': 'Transportation', 'type': 'expense'},
            4: {'id': 4, 'name': 'Salary', 'type': 'income'}
        }
    
    # Aggregate totals
    total_income = 0
    total_expense = 0
    by_category = {}
    for tx in transactions:
        cat = categories.get(tx['category_id'])
        if not cat:
            continue
        cat_type = cat['type']
        cat_name = cat['name']
        amount = float(tx['amount'])
        if cat_type == 'income':
            total_income += amount
        elif cat_type == 'expense':
            total_expense += amount
        # Breakdown by category
        if cat_name not in by_category:
            by_category[cat_name] = 0
        by_category[cat_name] += amount
    balance = total_income - total_expense
    return jsonify({
        'total_income': total_income,
        'total_expense': total_expense,
        'balance': balance,
        'by_category': by_category
    })

@budget_bp.route('/transactions/export', methods=['GET'])
@jwt_required()
@free_required
def export_transactions():
    user_id = get_jwt_identity()
    try:
        user_supabase = get_supabase_from_request()
        query = user_supabase.table('transactions').select('*').eq('user_id', user_id)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        category_id = request.args.get('category_id')
        min_amount = request.args.get('min_amount')
        max_amount = request.args.get('max_amount')
        search = request.args.get('search')
        if start_date:
            query = query.gte('date', start_date)
        if end_date:
            query = query.lte('date', end_date)
        if category_id:
            query = query.eq('category_id', category_id)
        if min_amount:
            query = query.gte('amount', float(min_amount))
        if max_amount:
            query = query.lte('amount', float(max_amount))
        if search:
            query = query.ilike('description', f'%{search}%')
        response = query.execute()
        transactions = response.data or []
        # Prepare CSV
        si = StringIO()
        if transactions:
            fieldnames = list(transactions[0].keys())
        else:
            fieldnames = ['id', 'user_id', 'category_id', 'amount', 'date', 'description', 'recurrence', 'created_at']
        writer = csv.DictWriter(si, fieldnames=fieldnames)
        writer.writeheader()
        for row in transactions:
            writer.writerow(row)
        output = si.getvalue()
        return (output, 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=transactions.csv'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/recurring/generate', methods=['POST'])
@jwt_required()
@free_required
def generate_recurring():
    user_id = get_jwt_identity()
    today = datetime.utcnow().date()
    # Fetch all recurring transactions
    response = supabase.table('transactions').select('*').eq('user_id', user_id).neq('recurrence', None).execute()
    rec_tx = response.data or []
    created = []
    for tx in rec_tx:
        # Determine the recurrence period
        rec = (tx.get('recurrence') or '').lower()
        if rec not in ['monthly', 'weekly', 'yearly']:
            continue
        # Find the most recent instance of this recurring transaction
        txs_same = supabase.table('transactions').select('*').eq('user_id', user_id).eq('recurrence', rec).eq('category_id', tx['category_id']).eq('amount', tx['amount']).eq('description', tx['description']).order('date', desc=True).limit(1).execute().data
        last_date = None
        if txs_same:
            last_date = datetime.strptime(txs_same[0]['date'], '%Y-%m-%d').date()
        # Calculate next due date
        if rec == 'monthly':
            next_due = (last_date or today) + relativedelta(months=1)
        elif rec == 'weekly':
            next_due = (last_date or today) + relativedelta(weeks=1)
        elif rec == 'yearly':
            next_due = (last_date or today) + relativedelta(years=1)
        # If next_due is today or earlier, and not already present, create it
        if next_due <= today:
            # Check if already exists for today
            exists = supabase.table('transactions').select('id').eq('user_id', user_id).eq('date', str(today)).eq('recurrence', rec).eq('category_id', tx['category_id']).eq('amount', tx['amount']).eq('description', tx['description']).execute().data
            if not exists:
                insert_data = {
                    'user_id': user_id,
                    'category_id': tx['category_id'],
                    'amount': tx['amount'],
                    'date': str(today),
                    'description': tx['description'],
                    'recurrence': rec
                }
                supabase.table('transactions').insert(insert_data).execute()
                created.append(insert_data)
    return jsonify({'created': created, 'count': len(created)})

# Debt Tracking API endpoints
@budget_bp.route('/debts', methods=['GET'])
@jwt_required()
@free_required
def get_debts():
    user_id = get_jwt_identity()
    try:
        response = supabase.table('debts').select('*').eq('user_id', user_id).execute()
        debts = response.data or []
        return jsonify(debts)
    except Exception as e:
        print(f"Supabase error for debts: {e}")
        # Return mock data if table doesn't exist
        mock_debts = [
            {
                'id': 1,
                'user_id': user_id,
                'item_name': 'Car Loan',
                'provider': 'Chase Bank',
                'due_date': '6th',
                'start_date': '2024-01-01',
                'end_date': '2027-01-01',
                'duration': '36 months',
                'original_amount': 25000,
                'current_balance': 18000,
                'monthly_payment': 750,
                'status': 'pending',
                'payment_status': {
                    '2024': {
                        'jan': True, 'feb': True, 'mar': True, 'apr': True,
                        'may': True, 'jun': True, 'jul': False, 'aug': False,
                        'sep': False, 'oct': False, 'nov': False, 'dec': False
                    },
                    '2025': {
                        'jan': True, 'feb': True, 'mar': True, 'apr': False,
                        'may': False, 'jun': False, 'jul': False, 'aug': False,
                        'sep': False, 'oct': False, 'nov': False, 'dec': False
                    }
                }
            },
            {
                'id': 2,
                'user_id': user_id,
                'item_name': 'Student Loan',
                'provider': 'Sallie Mae',
                'due_date': '15th',
                'start_date': '2023-06-01',
                'end_date': '2033-06-01',
                'duration': '120 months',
                'original_amount': 45000,
                'current_balance': 42000,
                'monthly_payment': 450,
                'status': 'pending',
                'payment_status': {
                    '2024': {
                        'jan': True, 'feb': True, 'mar': True, 'apr': True,
                        'may': True, 'jun': True, 'jul': True, 'aug': False,
                        'sep': False, 'oct': False, 'nov': False, 'dec': False
                    },
                    '2025': {
                        'jan': True, 'feb': True, 'mar': True, 'apr': False,
                        'may': False, 'jun': False, 'jul': False, 'aug': False,
                        'sep': False, 'oct': False, 'nov': False, 'dec': False
                    }
                }
            }
        ]
        return jsonify(mock_debts)

@budget_bp.route('/debts', methods=['POST'])
@jwt_required()
@free_required
def add_debt():
    user_id = get_jwt_identity()
    data = request.get_json()
    
    try:
        insert_data = {
            'user_id': user_id,
            'item_name': data['item_name'],
            'provider': data['provider'],
            'due_date': data['due_date'],
            'start_date': data['start_date'],
            'end_date': data['end_date'],
            'duration': data['duration'],
            'original_amount': data['original_amount'],
            'current_balance': data['current_balance'],
            'monthly_payment': data['monthly_payment'],
            'status': data.get('status', 'pending'),
            'payment_status': data.get('payment_status', {
                'jan': False, 'feb': False, 'mar': False, 'apr': False,
                'may': False, 'jun': False, 'jul': False, 'aug': False,
                'sep': False, 'oct': False, 'nov': False, 'dec': False
            })
        }
        
        response = supabase.table('debts').insert(insert_data).execute()
        
        if response.data:
            return jsonify({'message': 'Debt added', 'id': response.data[0]['id']}), 201
        else:
            return jsonify({'error': 'Failed to add debt'}), 400
    except Exception as e:
        print(f"Error adding debt: {e}")
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/debts/<int:debt_id>', methods=['PUT'])
@jwt_required()
@free_required
def update_debt(debt_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        update_data = {k: v for k, v in data.items() if k in [
            'item_name', 'provider', 'due_date', 'start_date', 'end_date', 
            'duration', 'original_amount', 'current_balance', 'monthly_payment', 
            'status', 'payment_status'
        ]}
        response = supabase.table('debts').update(update_data).eq('id', debt_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Debt updated'})
        else:
            return jsonify({'error': 'Debt not found or not updated'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/debts/<int:debt_id>', methods=['DELETE'])
@jwt_required()
@free_required
def delete_debt(debt_id):
    user_id = get_jwt_identity()
    try:
        response = supabase.table('debts').delete().eq('id', debt_id).eq('user_id', user_id).execute()
        if response.data:
            return jsonify({'message': 'Debt deleted'})
        else:
            return jsonify({'error': 'Debt not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@budget_bp.route('/debts/<int:debt_id>/payment-status', methods=['PUT'])
@jwt_required()
@free_required
def update_payment_status(debt_id):
    user_id = get_jwt_identity()
    data = request.get_json()
    try:
        month = data.get('month')
        year = data.get('year', str(datetime.utcnow().year))
        paid = data.get('paid', False)
        
        # Get current debt with all details
        response = supabase.table('debts').select('*').eq('id', debt_id).eq('user_id', user_id).execute()
        if not response.data:
            return jsonify({'error': 'Debt not found'}), 404
        
        debt = response.data[0]
        current_status = debt.get('payment_status', {}) or {}
        
        # Support both old format (simple month keys) and new format (year/month structure)
        if year and year != str(datetime.utcnow().year):
            # New format: nested year/month structure
            if year not in current_status:
                current_status[year] = {}
            current_status[year][month] = paid
        else:
            # Old format: simple month keys
            current_status[month] = paid
        
        # Calculate if debt is completed based on payment history and duration
        is_completed = check_debt_completion(debt, current_status)
        
        # Update payment status and potentially status
        update_data = {'payment_status': current_status}
        if is_completed:
            update_data['status'] = 'completed'
        
        update_response = supabase.table('debts').update(update_data).eq('id', debt_id).eq('user_id', user_id).execute()
        
        if update_response.data:
            return jsonify({'message': 'Payment status updated', 'debt_completed': is_completed})
        else:
            return jsonify({'error': 'Failed to update payment status'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def check_debt_completion(debt, payment_status):
    """
    Check if debt is completed based on payment history and duration
    """
    try:
        # Parse duration (e.g., "36 months", "120 months")
        duration_str = debt.get('duration', '')
        if not duration_str:
            return False
        
        # Extract number of months from duration
        import re
        duration_match = re.search(r'(\d+)\s*months?', duration_str.lower())
        if not duration_match:
            return False
        
        total_months = int(duration_match.group(1))
        
        # Count total paid months across all years
        total_paid_months = 0
        month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        
        for year, year_status in payment_status.items():
            if isinstance(year_status, dict):
                for month in month_names:
                    if month in year_status and year_status[month]:
                        total_paid_months += 1
        
        # Check if we've reached the total duration
        return total_paid_months >= total_months
        
    except Exception as e:
        print(f"Error checking debt completion: {e}")
        return False

@budget_bp.route('/debts/pending-transactions', methods=['GET'])
@jwt_required()
@free_required
def get_pending_debt_transactions():
    """Get pending debt transactions for the current month/year"""
    user_id = get_jwt_identity()
    month = request.args.get('month', datetime.utcnow().month)
    year = request.args.get('year', datetime.utcnow().year)
    
    try:
        # Get all debts for the user
        response = supabase.table('debts').select('*').eq('user_id', user_id).execute()
        debts = response.data or []
        
        # Get the "Debt Payments" category
        debt_category_response = supabase.table('categories').select('*').eq('name', 'Debt Payments').eq('user_id', user_id).execute()
        if not debt_category_response.data:
            # Try to get default debt category
            debt_category_response = supabase.table('categories').select('*').eq('name', 'Debt Payments').is_('user_id', 'null').execute()
        
        debt_category = debt_category_response.data[0] if debt_category_response.data else None
        
        pending_transactions = []
        month_names = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
        current_month = month_names[int(month) - 1] if isinstance(month, str) else month_names[month - 1]
        
        for debt in debts:
            if debt['status'] == 'pending':
                payment_status = debt.get('payment_status', {})
                
                # Check if payment is pending for current month/year
                is_paid = False
                if isinstance(payment_status, dict):
                    if str(year) in payment_status:
                        # New format: year/month structure
                        year_status = payment_status[str(year)]
                        if isinstance(year_status, dict) and current_month in year_status:
                            is_paid = year_status[current_month]
                    elif current_month in payment_status:
                        # Old format: simple month keys
                        is_paid = payment_status[current_month]
                
                if not is_paid:
                    # Create transaction data for pending debt
                    transaction_data = {
                        'id': f"debt_{debt['id']}",
                        'category_id': debt_category['id'] if debt_category else None,
                        'category_name': debt_category['name'] if debt_category else 'Debt Payments',
                        'amount': -abs(debt['monthly_payment']),  # Negative for expense
                        'description': f"{debt['item_name']} - {debt['provider']}",
                        'date': f"{year}-{str(month).zfill(2)}-{debt['due_date'].replace('th', '').replace('st', '').replace('nd', '').replace('rd', '').zfill(2)}",
                        'recurrence': 'monthly',
                        'status': 'missed',  # Default to missed since it's pending
                        'is_debt_transaction': True,
                        'debt_id': debt['id']
                    }
                    pending_transactions.append(transaction_data)
        
        return jsonify(pending_transactions)
    except Exception as e:
        print(f"Error getting pending debt transactions: {e}")
        return jsonify([])

@budget_bp.route('/debts/sync-transactions', methods=['POST'])
@jwt_required()
@free_required
def sync_debt_transactions():
    """Sync debt payment status with actual transactions"""
    user_id = get_jwt_identity()
    data = request.get_json()
    debt_id = data.get('debt_id')
    month = data.get('month')
    year = data.get('year')
    paid = data.get('paid', False)
    try:
        # Get the debt
        debt_response = supabase.table('debts').select('*').eq('id', debt_id).eq('user_id', user_id).execute()
        if not debt_response.data:
            return jsonify({'error': 'Debt not found'}), 404
        debt = debt_response.data[0]
        # Get the "Debt Payments" category
        debt_category_response = supabase.table('categories').select('*').eq('name', 'Debt Payments').eq('user_id', user_id).execute()
        if not debt_category_response.data:
            debt_category_response = supabase.table('categories').select('*').eq('name', 'Debt Payments').is_('user_id', 'null').execute()
        debt_category = debt_category_response.data[0] if debt_category_response.data else None
        # Consistent description
        description = f"{debt['item_name']} - {debt['provider']}"
        date_str = f"{year}-{str(month).zfill(2)}-{debt['due_date'].replace('th', '').replace('st', '').replace('nd', '').replace('rd', '').zfill(2)}"
        if paid:
            # Always match by debt_id if possible
            existing_response = supabase.table('transactions').select('*').eq('user_id', user_id).eq('debt_id', debt_id).eq('date', date_str).execute()
            if not existing_response.data:
                # Fallback for legacy: match by description
                existing_response = supabase.table('transactions').select('*').eq('user_id', user_id).eq('description', description).eq('date', date_str).execute()
            transaction_data = {
                'user_id': user_id,
                'category_id': debt_category['id'] if debt_category else None,
                'amount': -abs(debt['monthly_payment']),
                'description': description,
                'date': date_str,
                'recurrence': 'monthly',
                'debt_id': debt_id,
                'status': 'paid'
            }
            if existing_response.data:
                try:
                    supabase.table('transactions').update(transaction_data).eq('id', existing_response.data[0]['id']).execute()
                except Exception as update_error:
                    print(f"Update failed: {update_error}")
            else:
                try:
                    supabase.table('transactions').insert(transaction_data).execute()
                except Exception as insert_error:
                    print(f"Insert failed: {insert_error}")
        else:
            # Mark transaction as missed if it exists (by debt_id)
            existing_response = supabase.table('transactions').select('*').eq('user_id', user_id).eq('debt_id', debt_id).eq('date', date_str).execute()
            if not existing_response.data:
                # Fallback for legacy: match by description
                existing_response = supabase.table('transactions').select('*').eq('user_id', user_id).eq('description', description).eq('date', date_str).execute()
            if existing_response.data:
                try:
                    supabase.table('transactions').update({'status': 'missed', 'debt_id': debt_id}).eq('id', existing_response.data[0]['id']).execute()
                except Exception as status_error:
                    print(f"Status update failed: {status_error}")
        return jsonify({'message': 'Debt transactions synced'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# One-time endpoint to fix legacy debt transactions
@budget_bp.route('/fix-debt-transaction-ids', methods=['POST'])
@jwt_required()
@free_required
def fix_debt_transaction_ids():
    user_id = get_jwt_identity()
    try:
        # Get all debts
        debts_response = supabase.table('debts').select('*').eq('user_id', user_id).execute()
        debts = debts_response.data or []
        # Get all transactions in Debt Payments category
        debt_category_response = supabase.table('categories').select('*').eq('name', 'Debt Payments').eq('user_id', user_id).execute()
        if not debt_category_response.data:
            debt_category_response = supabase.table('categories').select('*').eq('name', 'Debt Payments').is_('user_id', 'null').execute()
        debt_category = debt_category_response.data[0] if debt_category_response.data else None
        if not debt_category:
            return jsonify({'error': 'No Debt Payments category found'}), 400
        transactions_response = supabase.table('transactions').select('*').eq('user_id', user_id).eq('category_id', debt_category['id']).execute()
        transactions = transactions_response.data or []
        updated = 0
        for tx in transactions:
            # Try to match by description
            for debt in debts:
                expected_desc = f"{debt['item_name']} - {debt['provider']}"
                if tx.get('description') == expected_desc:
                    # Patch debt_id if missing or incorrect
                    if tx.get('debt_id') != debt['id']:
                        try:
                            supabase.table('transactions').update({'debt_id': debt['id']}).eq('id', tx['id']).execute()
                            updated += 1
                        except Exception as e:
                            print(f"Failed to update tx {tx['id']}: {e}")
        return jsonify({'updated': updated})
    except Exception as e:
        return jsonify({'error': str(e)}), 500 