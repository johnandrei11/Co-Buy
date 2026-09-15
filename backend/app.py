from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pandas as pd
import time
import os
import json
import math
import tracemalloc
import hashlib
import hmac
import base64
import logging
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import datetime
from datetime import datetime, timedelta, timezone
import re
from mlxtend.frequent_patterns import apriori, fpgrowth, association_rules
from mlxtend.preprocessing import TransactionEncoder

import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('adaptive_miner')

MARKET_TYPE_THRESHOLDS = {
    'Coffee Shop':       {'min_support': 0.01,  'min_confidence': 0.20, 'min_lift': 1.0},
    'Convenience Store': {'min_support': 0.005, 'min_confidence': 0.15, 'min_lift': 1.0},
    'Pet Food':          {'min_support': 0.01,  'min_confidence': 0.15, 'min_lift': 1.0},
    'Default/unknown':   {'min_support': 0.005, 'min_confidence': 0.15, 'min_lift': 1.0}
}

app = Flask(__name__)
SECRET_KEY = os.environ.get('SECRET_KEY', 'cobuy-secure-hmac-key-production-2026')
app.secret_key = SECRET_KEY
CORS(app)

# Initialize database tables
db.init_db()

# ── Cryptographic Token Generation & Verification ────────────────────────────

def generate_auth_token(email, expires_in_seconds=86400 * 7):
    """Generate a tamper-proof cryptographically signed HMAC-SHA256 token containing user email and expiration."""
    exp = int(time.time()) + expires_in_seconds
    payload = json.dumps({'email': email.lower().strip(), 'exp': exp}, separators=(',', ':'))
    payload_b64 = base64.urlsafe_b64encode(payload.encode('utf-8')).decode('utf-8').rstrip('=')
    signature = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"cobuy_{payload_b64}_{signature}"

def verify_auth_token(token_str):
    """
    Verify the token signature and expiration.
    Returns user email if valid, or None if invalid/expired/tampered.
    Also accepts transition tokens 'mock-jwt-token-{email}' only if the user exists in database.
    """
    if not token_str or not isinstance(token_str, str):
        return None
    token_str = token_str.strip()
    if token_str.startswith('Bearer '):
        token_str = token_str[7:].strip()
        
    if token_str.startswith('cobuy_'):
        parts = token_str.split('_')
        if len(parts) != 3:
            return None
        _, payload_b64, signature = parts
        expected_sig = hmac.new(SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None # Tampered signature
        try:
            padding = len(payload_b64) % 4
            if padding:
                payload_b64 += '=' * (4 - padding)
            payload_json = base64.urlsafe_b64decode(payload_b64.encode('utf-8')).decode('utf-8')
            data = json.loads(payload_json)
            if data.get('exp') and time.time() > data['exp']:
                return None # Expired token
            email = data.get('email')
            return email.lower().strip() if email else None
        except Exception:
            return None

    # For transition backward compatibility with active sessions
    if token_str.startswith('mock-jwt-token-'):
        email = token_str.replace('mock-jwt-token-', '').strip().lower()
        if email and db.get_user(email):
            return email

    return None

def get_current_user_email():
    """Derive user identity ONLY from verified token. Never trust client-supplied owner ID."""
    auth = request.headers.get('Authorization', '')
    if auth:
        verified_email = verify_auth_token(auth)
        if verified_email:
            return verified_email
    return None

def get_current_user():
    """Return the full user dict for the authenticated requester, or None."""
    email = get_current_user_email()
    if not email:
        return None
    return db.get_user(email)

def require_authenticated_user():
    """
    Server-side guard: verify request has a valid authenticated session.
    Returns (user_info, error_tuple). If unauthenticated, returns (None, (response, 401)).
    """
    user_info = get_current_user()
    if not user_info:
        return None, (jsonify({'error': 'Unauthorized: invalid or missing authentication'}), 401)
    return user_info, None

def authorize_dataset_access(dataset_id, user_info):
    """
    Server-side guard: verify that dataset_id belongs to the authenticated user.
    Returns (dataset_info, error_tuple).
    Returns 404 if dataset not found, 403 if dataset belongs to another user.
    """
    if not dataset_id:
        return None, (jsonify({'error': 'dataset_id is required'}), 400)
    
    conn = db.get_db_connection()
    row = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    
    if not row:
        return None, (jsonify({'error': 'Dataset not found'}), 404)
        
    dataset = dict(row)
    dataset_owner = (dataset.get('user_email') or '').lower().strip()
    current_email = (user_info.get('email') or '').lower().strip()
    
    # Ownership match
    if dataset_owner == current_email:
        return dataset, None
        
    # Store-level sharing for team members belonging to the same store
    store_id = user_info.get('store_id')
    if store_id:
        store = db.get_store_by_id(store_id)
        if store and store.get('owner_email', '').lower().strip() == dataset_owner:
            return dataset, None

    return None, (jsonify({'error': 'Forbidden: you do not have permission to access this dataset'}), 403)

def _get_store_id_for_user(user_info):
    """Resolve store_id: shop_admin owns a store; team_member belongs to one."""
    if not user_info:
        return None
    store_id = user_info.get('store_id')
    if store_id:
        return store_id
    # shop_admin: look up store by ownership
    if user_info.get('role') == 'shop_admin':
        store = db.get_store_by_owner(user_info['email'])
        return store['id'] if store else None
    return None

def _require_shop_admin(user_info):
    """
    Server-side guard: return 403 unless the user's role column is 'shop_admin'.
    Authorization is based solely on the role column — never on email strings.
    """
    if not user_info or user_info.get('role') != 'shop_admin':
        return jsonify({'error': 'Forbidden: shop administrator access required'}), 403
    return None

# Keep legacy alias so existing call-sites continue to work
_require_admin = _require_shop_admin

def _log_current_user_action(action, details_dict=None):
    """Convenience wrapper — resolves store_id automatically. Logs user activity only."""
    user_info = get_current_user()
    if not user_info:
        return
    # Exclude shop administrators (audit log is for user activity)
    if user_info.get('role') == 'shop_admin' or user_info.get('account_type') == 'admin':
        return
    store_id = _get_store_id_for_user(user_info)
    db.log_activity(store_id, user_info['email'], action, details_dict)

# ── Email helper ─────────────────────────────────────────────────────────────

def send_invitation_email(to_email, store_name, invite_url, invited_by_name='Your Store Admin'):
    """
    Send an invitation email.
    Reads SMTP config from env vars; gracefully falls back to console log
    in development when SMTP_HOST is not set.
    """
    smtp_host = os.environ.get('SMTP_HOST', '')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASS', '')
    from_email = os.environ.get('FROM_EMAIL', smtp_user or 'noreply@cobuy.app')

    subject = f"You're invited to join {store_name} on Cobuy"
    body_html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="color:#3b82f6">You have been invited!</h2>
      <p><strong>{invited_by_name}</strong> has invited you to join
         <strong>{store_name}</strong> on Cobuy.</p>
      <p>Click the button below to accept your invitation (valid for 48 hours):</p>
      <a href="{invite_url}"
         style="display:inline-block;padding:12px 28px;background:#3b82f6;
                color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
        Accept Invitation
      </a>
      <p style="margin-top:24px;font-size:0.85rem;color:#888">
        Or log in to your Cobuy account — your bell notification will also show the invite.
      </p>
    </div>
    """

    if not smtp_host:
        # Development fallback — print to console
        logger.info(f"[EMAIL FALLBACK] To: {to_email} | Subject: {subject}")
        logger.info(f"[EMAIL FALLBACK] Invite URL: {invite_url}")
        return True

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From']    = from_email
        msg['To']      = to_email
        msg.attach(MIMEText(body_html, 'html'))

        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.ehlo()
            server.starttls()
            if smtp_user and smtp_pass:
                server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, [to_email], msg.as_string())
        return True
    except Exception as e:
        logger.warning(f"[EMAIL ERROR] Failed to send invite email to {to_email}: {e}")
        return False

# Storage for runtime/transient results
data_store = {
    'last_rules': None
}

NOISE_KEYWORDS = {
    'postage', 'post', 'shipping', 'freight', 'delivery', 'delivery fee',
    'discount', 'coupon', 'voucher', 'promo', 'promotion', 'manual',
    'fee', 'fees', 'bank charges', 'service charge', 'surcharge',
    'gift card', 'gift voucher', 'test', 'sample', 'samples', 'test product',
    'adjustment', 'canceled', 'cancellation', 'refund', 'return', 'returns',
    'credit note', 'bad debt', 'write-off', 'amazon fee', 'void', 'unknown',
    'carriage', 'packing', 'commission', 'handling', 'damaged', 'lost',
    'destroyed', 'missing', 'unspecified', 'miscellaneous', 'misc', 'item'
}

def standardize_date_string(val):
    """
    Robustly cleans, parses, and standardizes any date representation into ISO 'YYYY-MM-DD'.
    Handles:
      - Excel serial float/int (e.g. 46086 -> 2026-03-05)
      - YYYY/MM/DD, YYYY-MM-DD, YYYY.MM.DD (e.g. 2026/03/05 -> 2026-03-05)
      - DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, MM-DD-YYYY (e.g. 05/03/2026 -> 2026-05-03)
      - 8-digit integers (e.g. 20260305 -> 2026-03-05)
      - Full timestamps (e.g. 2026/03/05 14:30:00 -> 2026-03-05)
      - Textual dates (e.g. 05-May-2026, March 5 2026 -> 2026-05-05, 2026-03-05)
    """
    if pd.isna(val) or val is None:
        return None
    sval = str(val).strip()
    if not sval or sval.lower() in {'nan', 'none', 'null', 'nat', 'undefined'}:
        return None

    # 1. Excel serial numbers (typical retail datasets: 20000 to 65000)
    try:
        fval = float(val)
        if 20000 <= fval <= 65000:
            dt = datetime(1899, 12, 30) + timedelta(days=fval)
            return dt.strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        pass

    # 2. 8-digit integers YYYYMMDD
    if len(sval) == 8 and sval.isdigit():
        try:
            return datetime.strptime(sval, '%Y%m%d').strftime('%Y-%m-%d')
        except Exception:
            pass

    # Strip time part if present for clean date parsing
    clean_sval = re.split(r'[ T]', sval)[0].strip()
    parts = re.split(r'[-/.]', clean_sval)

    # 3. If YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
    if len(parts) == 3 and len(parts[0]) == 4 and parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
        try:
            y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            return datetime(y, m, d).strftime('%Y-%m-%d')
        except Exception:
            pass

    # 4. If DD/MM/YYYY or MM/DD/YYYY
    if len(parts) == 3 and len(parts[2]) == 4 and parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
        p0, p1, y = int(parts[0]), int(parts[1]), int(parts[2])
        try:
            if p0 > 12 >= p1:
                return datetime(y, p1, p0).strftime('%Y-%m-%d')
            elif p1 > 12 >= p0:
                return datetime(y, p0, p1).strftime('%Y-%m-%d')
            else:
                return datetime(y, p0, p1).strftime('%Y-%m-%d')
        except Exception:
            pass

    # 5. Fallback via pandas to_datetime (handles textual months: 05-May-2026, March 5, 2026, etc.)
    try:
        dt = pd.to_datetime(sval, errors='coerce')
        if pd.notna(dt):
            return dt.strftime('%Y-%m-%d')
    except Exception:
        pass

    return None

def format_date_human(val, full_month=False):
    """
    Transforms any raw date number/string (e.g. 2026/03/05 or 05/03/2026)
    into clean human-readable date e.g. 'Mar 05, 2026' or 'May 03, 2026' or full 'March 05, 2026'.
    """
    iso = standardize_date_string(val)
    if not iso:
        return str(val) if val else ''
    try:
        dt = datetime.strptime(iso, '%Y-%m-%d')
        fmt = '%B %d, %Y' if full_month else '%b %d, %Y'
        return dt.strftime(fmt)
    except Exception:
        return iso

def clean_item_name(raw):
    """
    Cleans dirty product/item names:
    - Strips leading/trailing punctuation, quotes, brackets, and symbols
    - Collapses multiple whitespace
    - Rejects pure numeric barcodes, nulls, and non-product retail noise
    - Normalizes case to clean Title Case while preserving standard acronyms
    """
    if pd.isna(raw) or raw is None:
        return None
    s = str(raw).strip()
    s = re.sub(r'^[\"\'\`\,\.\;\:\!\?\*\#\-\_\(\)\[\]\{\}\\\/]+', '', s)
    s = re.sub(r'[\"\'\`\,\.\;\:\!\?\*\#\-\_\(\)\[\]\{\}\\\/]+$', '', s)
    s = re.sub(r'[\s\u00a0]+', ' ', s).strip()
    
    if not s or len(s) <= 1:
        return None
    if s.lower() in {'nan', 'null', 'none', 'n/a', 'na', '?', '-', 'undefined', 'unknown', 'empty', 'void', 'missing'}:
        return None
    if s.lower() in NOISE_KEYWORDS:
        return None
    # Reject pure numeric barcode IDs
    if s.isdigit() and len(s) >= 4:
        return None

    # Title Case normalization
    if s.isupper() or s.islower():
        words = s.split(' ')
        capitalized = []
        acronyms = {'BLT', 'USB', 'BBQ', 'TV', 'DIY', 'LED', 'CD', 'DVD', 'PC'}
        for w in words:
            if w.upper() in acronyms:
                capitalized.append(w.upper())
            else:
                capitalized.append(w.capitalize())
        s = ' '.join(capitalized)
        
    return s

def parse_df_to_transactions(df):
    initial_rows = len(df)
    if initial_rows == 0 or len(df.columns) == 0:
        return [], 0, 0, [], None, None, [], []

    # Drop fully empty columns & clean column names
    df = df.dropna(how='all', axis=1)
    df.columns = [re.sub(r'[\"\']', '', str(c)).strip() for c in df.columns]

    # Drop exact duplicate rows
    df = df.drop_duplicates()
    duplicates_removed = initial_rows - len(df)

    # 1. Single-column format (comma/semicolon/pipe separated basket per line)
    if len(df.columns) == 1:
        col_name = df.columns[0]
        missing_removed = int(df[col_name].isna().sum())
        transactions = []
        raw_rows = df[col_name].dropna().astype(str).str.strip().tolist()
        for row in raw_rows:
            if not row or row.lower() in {'nan', 'null', 'none'}:
                continue
            delims = [',', ';', '|']
            delim = ','
            for d in delims:
                if d in row:
                    delim = d
                    break
            items = [clean_item_name(item) for item in row.split(delim)]
            valid_items = list(dict.fromkeys([it for it in items if it]))
            if valid_items:
                transactions.append(valid_items)
        detected_cols = [col_name]
        return transactions, duplicates_removed, missing_removed, [0.0]*len(transactions), None, None, [None]*len(transactions), detected_cols

    # 2. Check for Wide/Horizontal format:
    col_names_lower = [str(c).lower() for c in df.columns]
    has_id = any(any(k in c for k in ['id', 'invoice', 'order', 'receipt', 'trans', 'bill', 'txn']) for c in col_names_lower)

    if not has_id and len(df.columns) > 3:
        first_col_is_num = pd.to_numeric(df.iloc[:, 0], errors='coerce').notna().mean() > 0.8
        if not first_col_is_num:
            transactions = []
            missing_removed = 0
            for _, row in df.iterrows():
                basket = []
                for val in row:
                    item = clean_item_name(val)
                    if item:
                        basket.append(item)
                    elif pd.isna(val) or str(val).strip() == '':
                        missing_removed += 1
                unique_basket = list(dict.fromkeys(basket))
                if unique_basket:
                    transactions.append(unique_basket)
            detected_cols = [str(c) for c in df.columns[:5]]
            return transactions, duplicates_removed, missing_removed, [0.0]*len(transactions), None, None, [None]*len(transactions), detected_cols

    # 3. Standard Tidy / Vertical Format:
    col_id = None
    col_item = None
    col_qty = None
    col_price = None
    col_date = None

    id_keywords = ['invoice', 'order', 'receipt', 'trans', 'bill', 'txn', 'cart', 'basket', 'sale', 'id', 'no']
    item_keywords = ['product', 'item', 'desc', 'description', 'name', 'article', 'goods', 'sku', 'commodity', 'menu']
    date_keywords = ['date', 'time', 'datetime', 'timestamp', 'day', 'trans_date', 'sale_date', 'bill_date', 'invoicedate']
    qty_keywords = ['qty', 'quantity', 'count', 'vol', 'volume', 'amount_sold', 'units', 'pieces']
    price_keywords = ['price', 'unit_price', 'unitprice', 'cost', 'rate', 'item_price', 'amount', 'total']

    for col in df.columns:
        cl = str(col).lower()
        if col_id is None and any(kw in cl for kw in id_keywords):
            col_id = col
        elif col_date is None and any(kw in cl for kw in date_keywords):
            col_date = col
        elif col_qty is None and any(kw in cl for kw in qty_keywords):
            col_qty = col
        elif col_price is None and any(kw in cl for kw in price_keywords):
            col_price = col
        elif col_item is None and any(kw in cl for kw in item_keywords) and 'id' not in cl:
            col_item = col

    # Fallbacks
    if col_id is None:
        col_id = df.columns[0]
    if col_item is None:
        for col in df.columns:
            if col not in [col_id, col_date, col_qty, col_price]:
                col_item = col
                break
    if col_item is None:
        col_item = df.columns[1] if len(df.columns) > 1 else df.columns[0]

    detected_cols = [str(c) for c in [col_id, col_item, col_date, col_qty, col_price] if c is not None]

    # Clean rows
    missing_removed = 0
    noise_removed = 0
    tx_map = {}
    tx_dates_map = {}
    price_map = {}

    for _, row in df.iterrows():
        raw_id = row[col_id] if col_id in row else None
        raw_item = row[col_item] if col_item in row else None

        if pd.isna(raw_id) or str(raw_id).strip() in {'', 'nan', 'null', 'none'}:
            missing_removed += 1
            continue

        tx_id_str = str(raw_id).strip()
        # Drop cancellation invoices (e.g. C536379)
        if tx_id_str.upper().startswith('C') and len(tx_id_str) > 1 and tx_id_str[1:].isdigit():
            noise_removed += 1
            continue

        if pd.isna(raw_item) or str(raw_item).strip() in {'', 'nan', 'null', 'none'}:
            missing_removed += 1
            continue

        # Check quantity
        qty = 1
        if col_qty is not None and col_qty in row:
            try:
                raw_q = row[col_qty]
                if pd.notna(raw_q):
                    qty = int(float(raw_q))
            except Exception:
                qty = 1
        if qty <= 0:
            noise_removed += 1
            continue

        # Check item cleaning & noise
        raw_item_str = str(raw_item).strip()
        cleaned_item = clean_item_name(raw_item_str)
        if not cleaned_item:
            if raw_item_str.lower() in NOISE_KEYWORDS:
                noise_removed += 1
            else:
                missing_removed += 1
            continue

        # Split comma-separated items if present inside item cell
        items_in_cell = [clean_item_name(x) for x in cleaned_item.split(',') if clean_item_name(x)]
        if not items_in_cell:
            missing_removed += 1
            continue

        # Date handling with robust format normalization
        if tx_id_str not in tx_dates_map and col_date is not None and col_date in row:
            clean_date = standardize_date_string(row[col_date])
            tx_dates_map[tx_id_str] = clean_date

        # Price handling
        if col_price is not None and col_price in row:
            try:
                pval = float(row[col_price]) if pd.notna(row[col_price]) else 0.0
                if pval < 0:
                    pval = 0.0
            except Exception:
                pval = 0.0
            price_map[tx_id_str] = price_map.get(tx_id_str, 0.0) + (qty * pval)

        if tx_id_str not in tx_map:
            tx_map[tx_id_str] = []

        for it in items_in_cell:
            for _ in range(qty):
                tx_map[tx_id_str].append(it)

    # Convert to transaction list (deduplicating items within each transaction for mining)
    transactions = []
    basket_values_list = []
    tx_dates_list = []

    for tx_id, items in tx_map.items():
        if items:
            unique_items = list(dict.fromkeys(items))
            transactions.append(unique_items)
            basket_values_list.append(price_map.get(tx_id, 0.0))
            tx_dates_list.append(tx_dates_map.get(tx_id))

    basket_avg = sum(basket_values_list) / len(basket_values_list) if basket_values_list else 0.0

    valid_dates = [d for d in tx_dates_list if d]
    date_range_days = None
    if valid_dates:
        try:
            d_min = datetime.strptime(min(valid_dates), '%Y-%m-%d')
            d_max = datetime.strptime(max(valid_dates), '%Y-%m-%d')
            date_range_days = (d_max - d_min).days + 1
        except Exception:
            pass

    total_missing = missing_removed + noise_removed
    return transactions, duplicates_removed, total_missing, basket_values_list, date_range_days, basket_avg, tx_dates_list, detected_cols



@app.route('/')
def index():
    return jsonify({
        'status': 'healthy',
        'message': 'Shopping Pattern Finder Backend API is running'
    })

@app.route('/api/login', methods=['POST'])
def login():
    params = request.json or {}
    email    = params.get('email', '').strip().lower()
    password = params.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user_info = db.get_user(email)
    if not user_info:
        return jsonify({'error': 'Invalid email or password'}), 401

    # Check lockout status first
    lockout_info = db.get_user_lockout_info(email)
    if lockout_info and lockout_info['is_locked']:
        rem_sec = lockout_info['remaining_seconds']
        rem_min = max(1, (rem_sec + 59) // 60)
        return jsonify({
            'error': f'Account temporarily locked. Please try again after {rem_min} minute{"s" if rem_min > 1 else ""}.',
            'is_locked': True,
            'remaining_seconds': rem_sec,
            'locked_until': lockout_info['locked_until']
        }), 423

    # Check password
    if user_info['password'] != password:
        failed_res = db.record_failed_login(email)
        if failed_res and failed_res['is_locked']:
            return jsonify({
                'error': failed_res['message'],
                'is_locked': True,
                'remaining_seconds': failed_res['remaining_seconds'],
                'locked_until': failed_res['locked_until'],
                'failed_attempts': failed_res['failed_attempts']
            }), 423
        elif failed_res:
            return jsonify({
                'error': failed_res['message'],
                'is_locked': False,
                'attempts_remaining': failed_res['attempts_remaining'],
                'failed_attempts': failed_res['failed_attempts']
            }), 401
        else:
            return jsonify({'error': 'Invalid email or password'}), 401

    # Password is correct: reset lockout state
    db.reset_user_lockout(email)

    store_id   = _get_store_id_for_user(user_info)
    store_name = None
    if store_id:
        store      = db.get_store_by_id(store_id)
        store_name = store['name'] if store else None

    # role column is the authoritative source (shop_admin | team_member)
    role         = user_info.get('role') or 'shop_admin'
    account_type = user_info.get('account_type') or 'admin'
    status       = user_info.get('status') or 'active'

    return jsonify({
        'token': generate_auth_token(email),
        'user': {
            'email':        email,
            'name':         user_info['name'],
            'role':         role,
            'account_type': account_type,
            'status':       status,
            'store_id':     store_id,
            'store_name':   store_name
        }
    })

@app.route('/api/admin/unlock-account', methods=['POST'])
def unlock_account():
    params = request.json or {}
    email = params.get('email', '').strip().lower()
    if not email:
        return jsonify({'error': 'User email is required'}), 400

    user = db.get_user(email)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    db.unlock_user_account(email)
    return jsonify({'message': f'Account {email} has been unlocked successfully.'})

@app.route('/api/register', methods=['POST'])
def register():
    params = request.json or {}
    email        = params.get('email', '').strip().lower()
    password     = params.get('password', '')
    name         = params.get('name', '').strip()
    account_type = params.get('account_type', 'admin').strip()  # 'admin' | 'member'
    store_name   = params.get('store_name', '').strip()         # Required if admin

    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    if account_type == 'admin' and not store_name:
        return jsonify({'error': 'Store name is required for Shop Administrators'}), 400

    if account_type == 'member':
        # Team members register with pending status — no store until they accept an invite
        success = db.create_user(email, password, name, 'team_member',
                                 account_type='member', store_id=None, status='pending')
        if not success:
            return jsonify({'error': 'Email is already registered'}), 409
        return jsonify({
            'message': 'Registration successful. Awaiting administrator invitation.',
            'pending': True,
            'user': {
                'email': email,
                'name': name,
                'role': 'team_member',
                'account_type': 'member',
                'status': 'pending'
            }
        }), 201
    else:
        # Shop Administrator: create user + store atomically
        success = db.create_user(email, password, name, 'shop_admin',
                                 account_type='admin', store_id=None, status='active')
        if not success:
            return jsonify({'error': 'Email is already registered'}), 409

        store_id = db.create_store(store_name, email)
        db.update_user_store(email, store_id, status='active')

        return jsonify({
            'message': 'Registration successful',
            'token': generate_auth_token(email),
            'user': {
                'email': email,
                'name': name,
                'role': 'shop_admin',
                'account_type': 'admin',
                'status': 'active',
                'store_id': store_id,
                'store_name': store_name
            }
        }), 201

@app.route('/api/upload', methods=['POST'])
def upload_file():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        file_content = file.read()
        file_hash = hashlib.sha256(file_content).hexdigest()
        file.seek(0)

        if file.filename.endswith('.csv'):
            df = pd.read_csv(file)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file)
        else:
            return jsonify({'error': 'Invalid file format'}), 400

        # Preprocessing & Data Cleaning
        transactions, duplicates_removed, missing_removed, basket_values_list, date_range_days, basket_avg, tx_dates_list, detected_cols = parse_df_to_transactions(df)

        if not transactions:
            ds_id = db.add_dataset(file.filename, 0, 0, user_email=user_email, file_hash=file_hash, market_type='Default/unknown',
                                   missing_count=missing_removed, duplicates_count=duplicates_removed, columns_detected=detected_cols)
            return jsonify({
                'message': 'File uploaded with empty dataset warning',
                'transaction_count': 0,
                'unique_items': 0,
                'dataset_id': ds_id,
                'is_empty': True,
                'warning': 'The uploaded file contains no valid transaction data (0 records).',
                'cleaning_stats': {
                    'missing_values_removed': missing_removed,
                    'duplicate_items_removed': duplicates_removed
                }
            })

        total_tx = len(transactions)
        unique_items_count = len(set([item for sublist in transactions for item in sublist]))

        existing_ds = db.get_dataset_by_hash(file_hash, user_email=user_email)
        if not existing_ds:
            datasets = db.get_datasets(user_email=user_email)
            for ds in datasets:
                if ds['name'] == file.filename:
                    existing_ds = ds
                    break

        if existing_ds:
            ds_id = existing_ds['id']
            # Check if transactions already exist for this dataset
            txs_exist = db.transactions_exist(ds_id, user_email=user_email)
            if not txs_exist:
                db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list, dates=tx_dates_list)
            return jsonify({
                'duplicate_detected': True,
                'message': f'This file ("{existing_ds["name"]}") is already in your File History (uploaded on {existing_ds.get("upload_date", "")}). Reusing the existing dataset.',
                'transaction_count': total_tx,
                'unique_items': unique_items_count,
                'dataset_id': ds_id,
                'cleaning_stats': {
                    'missing_values_removed': missing_removed,
                    'duplicate_items_removed': duplicates_removed
                }
            })

        # Save dataset metadata scoped to current user with SHA-256 hash
        market_type = 'Default/unknown'
        ds_id = db.add_dataset(file.filename, total_tx, unique_items_count, user_email=user_email, file_hash=file_hash, market_type=market_type,
                               basket_avg=basket_avg, date_range_days=date_range_days,
                               missing_count=missing_removed, duplicates_count=duplicates_removed, columns_detected=detected_cols)
        
        # Store new transactions without clearing other datasets
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list, dates=tx_dates_list)

        # ── Audit log ────────────────────────────────────────────────────────
        _log_current_user_action('UPLOAD_HISTORICAL_DATA', {
            'filename': file.filename,
            'transaction_count': total_tx,
            'unique_items': unique_items_count,
            'market_type': market_type,
            'missing_values_removed': missing_removed,
            'duplicates_removed': duplicates_removed,
            'dataset_id': ds_id
        })
        
        return jsonify({
            'message': 'File cleaned and processed successfully',
            'transaction_count': total_tx,
            'unique_items': unique_items_count,
            'dataset_id': ds_id,
            'cleaning_stats': {
                'missing_values_removed': missing_removed,
                'duplicate_items_removed': duplicates_removed
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/mine', methods=['POST'])
def mine_rules():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    params = request.json or {}
    algorithm = params.get('algorithm', 'auto') # 'auto', 'apriori', or 'fpgrowth'
    dataset_id = params.get('dataset_id') or request.args.get('dataset_id')
    if not dataset_id:
        return jsonify({'error': 'No dataset selected or active in analytics'}), 400

    dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if transactions is None or len(transactions) == 0:
        return jsonify({
            'dataset_id': dataset_id,
            'rules': [],
            'frequent_itemsets': [],
            'algorithm_used': algorithm,
            'execution_time_seconds': 0.001,
            'total_transactions': 0,
            'is_empty': True,
            'message': 'No association rules could be mined because the dataset contains 0 transactions.'
        })

    try:
        start_time = time.time()
        
        # Determine market type and starting thresholds
        dataset_info = db.get_dataset_by_id(dataset_id, user_email=user_email) if dataset_id else None
        market_type = dataset_info.get('market_type') if (dataset_info and dataset_info.get('market_type')) else 'Default/unknown'
            
        market_config = MARKET_TYPE_THRESHOLDS.get(market_type, MARKET_TYPE_THRESHOLDS['Default/unknown'])
        curr_supp = market_config['min_support']
        curr_conf = market_config['min_confidence']
        fixed_lift = market_config['min_lift']
        
        FLOOR_SUPPORT = 0.0001
        FLOOR_CONFIDENCE = 0.02
        MIN_RULES_TARGET = 3

        # Preprocessing for association rule mining
        te = TransactionEncoder()
        te_ary = te.fit(transactions).transform(transactions)
        df = pd.DataFrame(te_ary, columns=te.columns_)

        # Intelligent Auto-Selection Logic
        selected_algorithm = algorithm
        algorithm_note = algorithm
        
        if algorithm == 'auto':
            num_tx = len(transactions)
            all_items = [item for sublist in transactions for item in sublist]
            num_items = len(set(all_items))
            
            # If large dataset or very dense itemsets, use FP-Growth. Otherwise use Apriori.
            if num_tx >= 500 or num_items >= 50:
                selected_algorithm = 'fpgrowth'
                algorithm_note = 'FP-Growth (Auto-selected for large data)'
            else:
                selected_algorithm = 'apriori'
                algorithm_note = 'Apriori (Auto-selected for small data)'

        step = 0
        best_rules = pd.DataFrame()
        best_frequent_itemsets = pd.DataFrame()
        used_supp = curr_supp
        used_conf = curr_conf
        used_step = step

        while True:
            if selected_algorithm == 'apriori':
                frequent_itemsets = apriori(df, min_support=curr_supp, use_colnames=True)
            else:
                frequent_itemsets = fpgrowth(df, min_support=curr_supp, use_colnames=True)
                
            if frequent_itemsets.empty:
                current_rules = pd.DataFrame()
            else:
                current_rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=curr_conf)
                if not current_rules.empty:
                    current_rules = current_rules[current_rules['lift'] >= fixed_lift]
                    
            if not current_rules.empty and (best_rules.empty or len(current_rules) > len(best_rules)):
                best_rules = current_rules
                best_frequent_itemsets = frequent_itemsets
                used_supp = curr_supp
                used_conf = curr_conf
                used_step = step
                
            if len(current_rules) >= MIN_RULES_TARGET:
                best_rules = current_rules
                best_frequent_itemsets = frequent_itemsets
                used_supp = curr_supp
                used_conf = curr_conf
                used_step = step
                break
                
            if curr_supp <= FLOOR_SUPPORT and curr_conf <= FLOOR_CONFIDENCE:
                if best_rules.empty:
                    used_supp = curr_supp
                    used_conf = curr_conf
                    used_step = step
                break
                
            step += 1
            next_supp = max(curr_supp / 2.0, FLOOR_SUPPORT)
            next_conf = max(curr_conf - 0.05, FLOOR_CONFIDENCE)
            if next_supp == curr_supp and next_conf == curr_conf:
                if best_rules.empty:
                    used_supp = curr_supp
                    used_conf = curr_conf
                    used_step = step
                break
            curr_supp = next_supp
            curr_conf = next_conf

        logger.info(
            f"[ADAPTIVE MINING LOG] Dataset ID: {dataset_id} | Market Type: '{market_type}' | "
            f"Tier Step: {used_step} | Starting (Supp: {market_config['min_support']:.4f}, Conf: {market_config['min_confidence']:.4f}) | "
            f"Final Used (Supp: {used_supp:.4f}, Conf: {used_conf:.4f}, Lift: {fixed_lift}) | "
            f"Rules Found: {len(best_rules)}"
        )

        frequent_itemsets = best_frequent_itemsets
        rules = best_rules
        execution_time = time.time() - start_time

        if rules.empty and transactions:
            # Fallback 1: Derive rules from multi-item frequent itemsets
            derived_list = []
            if not frequent_itemsets.empty:
                item_supp_map = {}
                for _, r_item in frequent_itemsets.iterrows():
                    its = list(r_item['itemsets'])
                    if len(its) == 1:
                        item_supp_map[its[0]] = r_item['support']
                for _, r_item in frequent_itemsets.iterrows():
                    its = list(r_item['itemsets'])
                    if len(its) >= 2:
                        sup = r_item['support']
                        for i in range(len(its)):
                            for j in range(len(its)):
                                if i != j:
                                    ant_name = its[i]
                                    cons_name = its[j]
                                    ant_sup = item_supp_map.get(ant_name, sup)
                                    cons_sup = item_supp_map.get(cons_name, sup)
                                    conf = sup / ant_sup if ant_sup > 0 else 0.0
                                    lift = conf / cons_sup if cons_sup > 0 else 1.0
                                    derived_list.append({
                                        'antecedents': frozenset([ant_name]),
                                        'consequents': frozenset([cons_name]),
                                        'support': sup,
                                        'confidence': conf,
                                        'lift': lift,
                                        'leverage': 0.0,
                                        'conviction': 1.0
                                    })
            if derived_list:
                rules = pd.DataFrame(derived_list).sort_values(by=['confidence', 'support'], ascending=[False, False])
            else:
                # Fallback 2: Direct co-occurrence pair rule synthesis
                total_tx = len(transactions)
                pair_counts = {}
                item_counts = {}
                for tx in transactions:
                    unique_tx = set([str(it).strip() for it in tx if it])
                    for it in unique_tx:
                        item_counts[it] = item_counts.get(it, 0) + 1
                    tx_items = sorted(list(unique_tx))
                    for i in range(len(tx_items)):
                        for j in range(i+1, len(tx_items)):
                            pair = (tx_items[i], tx_items[j])
                            pair_counts[pair] = pair_counts.get(pair, 0) + 1
                
                co_rules = []
                for (a, b), cnt in pair_counts.items():
                    sup_ab = cnt / total_tx
                    sup_a = item_counts[a] / total_tx
                    sup_b = item_counts[b] / total_tx
                    conf_ab = cnt / item_counts[a]
                    conf_ba = cnt / item_counts[b]
                    lift_ab = conf_ab / sup_b if sup_b > 0 else 1.0
                    lift_ba = conf_ba / sup_a if sup_a > 0 else 1.0
                    
                    co_rules.append({
                        'antecedents': frozenset([a]),
                        'consequents': frozenset([b]),
                        'support': sup_ab,
                        'confidence': conf_ab,
                        'lift': lift_ab,
                        'leverage': 0.0,
                        'conviction': 1.0
                    })
                    co_rules.append({
                        'antecedents': frozenset([b]),
                        'consequents': frozenset([a]),
                        'support': sup_ab,
                        'confidence': conf_ba,
                        'lift': lift_ba,
                        'leverage': 0.0,
                        'conviction': 1.0
                    })
                if co_rules:
                    rules = pd.DataFrame(co_rules).sort_values(by=['confidence', 'support'], ascending=[False, False]).head(50)

        if rules.empty:
            metrics = {
                'execution_time': execution_time,
                'rules_count': 0,
                'frequent_itemsets_count': len(frequent_itemsets) if not frequent_itemsets.empty else 0,
                'algorithm': algorithm_note,
                'adaptive_thresholds': {
                    'market_type': market_type,
                    'tier_step': used_step,
                    'starting_support': market_config['min_support'],
                    'starting_confidence': market_config['min_confidence'],
                    'final_support': used_supp,
                    'final_confidence': used_conf,
                    'fixed_lift': fixed_lift,
                    'rules_found': 0
                }
            }
            return jsonify({
                'dataset_id': dataset_id,
                'rules': [],
                'frequent_itemsets': [],
                'gaps': [],
                'metrics': metrics,
                'message': 'No statistically significant buying patterns could be discovered in this dataset, even after relaxing thresholds to the minimum floor (support 0.01%, confidence 2%). This typically occurs when there are too few transactions or high product variety without repeated co-purchases.'
            })

        # Format rules for JSON
        def clean_float(val, default=0.0):
            if pd.isna(val) or math.isnan(val):
                return default
            if math.isinf(val):
                return 999.0 if val > 0 else -999.0
            return float(val)

        formatted_rules = []
        if not rules.empty:
            for _, row in rules.iterrows():
                formatted_rules.append({
                    'antecedents': list(row['antecedents']),
                    'consequents': list(row['consequents']),
                    'support': clean_float(row['support']),
                    'confidence': clean_float(row['confidence']),
                    'lift': clean_float(row['lift']),
                    'leverage': clean_float(row['leverage']),
                    'conviction': clean_float(row['conviction'])
                })

        # Format frequent itemsets for JSON
        formatted_itemsets = []
        for _, row in frequent_itemsets.iterrows():
            formatted_itemsets.append({
                'items': list(row['itemsets']),
                'support': clean_float(row['support'])
            })

        # Gap Analysis / Missing Links Detector
        gaps = []
        item_supports = {}
        for _, row in frequent_itemsets.iterrows():
            items = list(row['itemsets'])
            if len(items) == 1:
                item_supports[items[0]] = row['support']
                
        sorted_items = sorted(item_supports.items(), key=lambda x: x[1], reverse=True)
        top_n_items = [item for item, sup in sorted_items[:10]]
        
        all_pairs = []
        for i in range(len(top_n_items)):
            for j in range(i + 1, len(top_n_items)):
                all_pairs.append((top_n_items[i], top_n_items[j]))
                
        associated_pairs = set()
        for r in formatted_rules:
            for ant in r['antecedents']:
                for cons in r['consequents']:
                    associated_pairs.add(frozenset([ant, cons]))
                    
        frequent_sets = [frozenset(row['itemsets']) for _, row in frequent_itemsets.iterrows()]
        
        for itemA, itemB in all_pairs:
            pair = frozenset([itemA, itemB])
            if pair not in frequent_sets and pair not in associated_pairs:
                supportA = item_supports.get(itemA, 0)
                supportB = item_supports.get(itemB, 0)
                gaps.append({
                    'item_a': itemA,
                    'item_b': itemB,
                    'support_a': clean_float(supportA),
                    'support_b': clean_float(supportB),
                    'reason': f"Both '{itemA}' ({(supportA*100):.1f}% support) and '{itemB}' ({(supportB*100):.1f}% support) are popular, but they are rarely or never purchased together."
                })

        # ── Per-rule enrichment: raw counts, baseline rate, revenue estimate ──
        # Pre-build frozensets once for O(rules × transactions) pass
        tx_sets = [frozenset(tx) for tx in transactions]
        total_tx = len(tx_sets)

        # Basket values (list parallel to transactions, 0.0 if unavailable)
        basket_values_list = db.get_transaction_basket_values(user_email=user_email, dataset_id=dataset_id)
        has_basket_data = bool(basket_values_list) and any(v > 0 for v in basket_values_list)

        # Dataset-level date range for monthly extrapolation
        ds_date_range_days = dataset_info.get('date_range_days') if dataset_info else None

        for rule_obj in formatted_rules:
            ant_set  = frozenset(rule_obj['antecedents'])
            cons_set = frozenset(rule_obj['consequents'])
            full_set = ant_set | cons_set

            ant_tx_count  = sum(1 for tx in tx_sets if ant_set  <= tx)
            rule_tx_count = sum(1 for tx in tx_sets if full_set <= tx)
            cons_tx_count = sum(1 for tx in tx_sets if cons_set <= tx)

            baseline_rate = cons_tx_count / total_tx if total_tx > 0 else 0.0

            # Revenue: average basket value for transactions matching the full rule
            avg_rule_basket  = None
            monthly_estimate = None
            rule_has_revenue = False
            if has_basket_data and basket_values_list:
                rule_baskets = [
                    basket_values_list[i]
                    for i, tx in enumerate(tx_sets)
                    if full_set <= tx and i < len(basket_values_list)
                ]
                if rule_baskets and sum(rule_baskets) > 0:
                    avg_rule_basket  = sum(rule_baskets) / len(rule_baskets)
                    rule_has_revenue = True
                    if ds_date_range_days and ds_date_range_days > 0:
                        monthly_estimate = rule_tx_count * avg_rule_basket * (30.0 / ds_date_range_days)

            rule_obj['ant_tx_count']             = ant_tx_count
            rule_obj['rule_tx_count']             = rule_tx_count
            rule_obj['consequent_baseline_rate']  = clean_float(baseline_rate)
            rule_obj['avg_rule_basket']           = clean_float(avg_rule_basket) if avg_rule_basket is not None else None
            rule_obj['monthly_estimate']          = clean_float(monthly_estimate) if monthly_estimate is not None else None
            rule_obj['has_revenue_data']          = rule_has_revenue

        data_store['last_rules'] = formatted_rules
        
        metrics = {
            'execution_time': execution_time,
            'rules_count': len(formatted_rules),
            'frequent_itemsets_count': len(frequent_itemsets),
            'algorithm': algorithm_note,
            'date_range_days': ds_date_range_days,
            'adaptive_thresholds': {
                'market_type': market_type,
                'tier_step': used_step,
                'starting_support': market_config['min_support'],
                'starting_confidence': market_config['min_confidence'],
                'final_support': used_supp,
                'final_confidence': used_conf,
                'fixed_lift': fixed_lift,
                'rules_found': len(formatted_rules)
            }
        }

        return jsonify({
            'dataset_id': dataset_id,
            'rules': formatted_rules,
            'frequent_itemsets': formatted_itemsets,
            'gaps': gaps,
            'metrics': metrics
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@app.route('/api/stats', methods=['GET'])
def get_stats():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    dataset_id = request.args.get('dataset_id')
    if not dataset_id:
        return jsonify({
            'active': False,
            'dataset_id': None,
            'total_transactions': 0,
            'unique_items_count': 0,
            'top_items': [],
            'all_items': [],
            'recommended_algorithm': 'None'
        })

    dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if transactions is None or len(transactions) == 0:
        return jsonify({
            'active': True,
            'is_empty': True,
            'dataset_id': dataset_id,
            'total_transactions': 0,
            'unique_items_count': 0,
            'top_items': [],
            'all_items': [],
            'recommended_algorithm': 'None'
        })
    
    total_transactions = len(transactions)
    # Get unique items per transaction for basket counting
    basket_items = []
    for sublist in transactions:
        basket_items.extend(list(set(sublist)))
        
    if len(basket_items) == 0:
        return jsonify({
            'active': True,
            'total_transactions': total_transactions,
            'unique_items_count': 0,
            'top_items': [],
            'all_items': [],
            'recommended_algorithm': 'None'
        })
        
    item_counts = pd.Series(basket_items).value_counts().to_dict()
    total_items_sold = sum(item_counts.values()) or 1
    
    formatted_all_items = [
        {
            'name': k, 
            'value': int(v),
            'count': int(v),
            'quantity': int(v),
            'support': float(v) / total_transactions,
            'quantity_share': round((float(v) / total_items_sold) * 100, 1),
            'transaction_share': round((float(v) / total_transactions) * 100, 1)
        } 
        for k, v in item_counts.items()
    ]
    
    unique_items_count = len(item_counts)
    recommended = 'FP-Growth' if total_transactions >= 500 or unique_items_count >= 50 else 'Apriori'

    # Compute dataset health metrics
    tx_with_dates = db.get_transactions_with_dates(user_email=user_email, dataset_id=dataset_id) or []
    distinct_dates = sorted(list(set([tx['date'].split(' ')[0] for tx in tx_with_dates if tx.get('date')])))
    
    date_range_str = "No dates recorded"
    if len(distinct_dates) == 1:
        try:
            d_obj = datetime.strptime(distinct_dates[0], '%Y-%m-%d')
            date_range_str = d_obj.strftime('%b %d, %Y')
        except Exception:
            date_range_str = distinct_dates[0]
    elif len(distinct_dates) > 1:
        try:
            d_start = datetime.strptime(distinct_dates[0], '%Y-%m-%d')
            d_end = datetime.strptime(distinct_dates[-1], '%Y-%m-%d')
            date_range_str = f"{d_start.strftime('%b %d')} — {d_end.strftime('%b %d, %Y')}"
        except Exception:
            date_range_str = f"{distinct_dates[0]} — {distinct_dates[-1]}"

    missing_count = dataset_info.get('missing_count') or 0
    duplicates_count = dataset_info.get('duplicates_count') or 0
    raw_cols = dataset_info.get('columns_detected')
    if raw_cols:
        try:
            cols_list = json.loads(raw_cols) if isinstance(raw_cols, str) else raw_cols
        except Exception:
            cols_list = ['Transaction ID', 'Item Name']
    else:
        cols_list = ['Transaction ID', 'Item Name']
        if distinct_dates:
            cols_list.append('Transaction Date')

    if total_transactions == 0:
        health_status = 'unable_to_analyze'
        health_label = 'Unable to Analyze'
        health_msg = 'The uploaded dataset contains 0 valid transactions.'
    elif missing_count > 0:
        health_status = 'needs_attention'
        health_label = 'Needs Attention'
        health_msg = f'{missing_count} rows with missing product names were cleaned during processing.'
    else:
        health_status = 'ready'
        health_label = 'Ready'
        health_msg = 'Your data is complete and ready for analysis.'
    
    return jsonify({
        'active': True,
        'dataset_id': dataset_id,
        'dataset_name': dataset_info.get('name') or f"Dataset #{dataset_id}",
        'market_type': dataset_info.get('market_type') or 'Default/unknown',
        'upload_date': dataset_info.get('upload_date'),
        'date_range_str': date_range_str,
        'total_transactions': total_transactions,
        'total_units_sold': total_items_sold,
        'unique_items_count': unique_items_count,
        'top_items': formatted_all_items[:10],
        'all_items': formatted_all_items,
        'recommended_algorithm': recommended,
        'health': {
            'status': health_status,
            'status_label': health_label,
            'message': health_msg,
            'valid_transactions': total_transactions,
            'unique_products': unique_items_count,
            'distinct_dates_count': len(distinct_dates),
            'missing_names_count': missing_count,
            'duplicates_removed': duplicates_count,
            'columns_detected': cols_list,
            'date_range_str': date_range_str
        }
    })

@app.route('/api/frequently_bought_together', methods=['GET'])
def get_frequently_bought_together():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    selected_product = request.args.get('product')
    dataset_id = request.args.get('dataset_id')

    if dataset_id:
        dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
        if auth_err:
            return auth_err[0], auth_err[1]

    if not selected_product:
        return jsonify({
            'selected_product': '',
            'frequently_bought_together': []
        })

    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if transactions is None or len(transactions) == 0:
        return jsonify({
            'selected_product': selected_product,
            'frequently_bought_together': []
        })

    co_counts = {}
    target_clean = selected_product.strip()
    
    for tx in transactions:
        tx_items = [str(item).strip() for item in tx if item]
        if any(item.lower() == target_clean.lower() for item in tx_items):
            distinct_others = set([item for item in tx_items if item.lower() != target_clean.lower()])
            for other in distinct_others:
                co_counts[other] = co_counts.get(other, 0) + 1

    results = [
        {'product_name': name, 'count': count}
        for name, count in co_counts.items()
    ]
    results.sort(key=lambda x: (-x['count'], x['product_name'].lower()))

    return jsonify({
        'selected_product': selected_product,
        'frequently_bought_together': results
    })

@app.route('/api/add_transaction', methods=['POST'])
def add_transaction():
    params = request.json or {}
    items = params.get('items', [])
    if not items:
        return jsonify({'error': 'No items in transaction'}), 400
    
    # Strip whitespace, ignore empty items. Keep duplicates to accurately reflect quantity in frequency stats.
    cleaned_items = sorted([item.strip() for item in items if item.strip()])
    if not cleaned_items:
        return jsonify({'error': 'No valid items in transaction'}), 400
        
    db.add_transaction(cleaned_items)
    
    current_transactions = db.get_transactions() or []
    
    return jsonify({
        'message': 'Transaction added successfully',
        'total_transactions': len(current_transactions),
        'unique_items_count': len(set([item for sublist in current_transactions for item in sublist]))
    })

@app.route('/api/load_template', methods=['POST'])
def load_template():
    params = request.json or {}
    template_type = params.get('type')
    
    filename_map = {
        'convenience': 'convenience_store.csv',
        'pet': 'Pet_Shop_Transactions.csv',
        'coffee': 'coffee_shop.csv'
    }
    
    filename = filename_map.get(template_type)
    if not filename:
        return jsonify({'error': 'Invalid template type'}), 400
        
    try:
        # Check if the file is in the workspace root or parent
        filepath = os.path.join(os.getcwd(), filename)
        if not os.path.exists(filepath):
            # Try one level up if running from backend/
            filepath = os.path.join(os.path.dirname(os.getcwd()), filename)
            
        if not os.path.exists(filepath):
            # Try parent directory relative to cwd
            filepath = os.path.join(os.getcwd(), "..", filename)
            
        if not os.path.exists(filepath):
            return jsonify({'error': f'Template file {filename} not found'}), 404
            
        df = pd.read_csv(filepath)
        
        transactions, duplicates_removed, missing_removed, basket_values_list, date_range_days, basket_avg, tx_dates_list, detected_cols = parse_df_to_transactions(df)
            
        user_email = get_current_user_email()
        # Compute unique items count
        unique_items_count = len(set([item for sublist in transactions for item in sublist]))
        total_tx = len(transactions)
        market_type_map = {
            'convenience': 'Convenience Store',
            'pet': 'Pet Food',
            'coffee': 'Coffee Shop'
        }
        market_type = market_type_map.get(template_type, 'Default/unknown')
        ds_id = db.add_dataset(filename, total_tx, unique_items_count, user_email=user_email, market_type=market_type,
                               basket_avg=basket_avg, date_range_days=date_range_days,
                               missing_count=missing_removed, duplicates_count=duplicates_removed, columns_detected=detected_cols)
        
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list, dates=tx_dates_list)
        data_store['last_rules'] = None # Clear previous rules
        
        return jsonify({
            'message': f'Template {filename} loaded successfully',
            'transaction_count': total_tx,
            'unique_items': unique_items_count
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']
    store_id = _get_store_id_for_user(user_info)
    show_all = request.args.get('all') == 'true'
    
    if show_all and store_id:
        datasets = db.get_datasets_by_store(store_id)
    else:
        db.cleanup_duplicate_datasets(user_email=user_email)
        datasets = db.get_datasets(user_email=user_email)
    return jsonify({'datasets': datasets})

@app.route('/api/datasets/<int:dataset_id>', methods=['DELETE'])
def delete_dataset_endpoint(dataset_id):
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    db.delete_dataset(dataset_id, user_email=user_email)
    # ── Audit log ────────────────────────────────────────────────────────────
    _log_current_user_action('PURGE_HISTORICAL_DATA', {
        'dataset_id': dataset_id,
        'filename': dataset_info.get('name'),
        'transaction_count': dataset_info.get('transaction_count'),
        'market_type': dataset_info.get('market_type')
    })
    return jsonify({'message': 'Dataset deleted successfully'})

def generate_recommendations_csv(dataset_id, user_email=None):
    """Generate recommendation results CSV for a dataset ID."""
    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if not transactions:
        return "No transaction data found for dataset."

    dataset_info = db.get_dataset_by_id(dataset_id, user_email=user_email)
    ds_name = dataset_info.get('name', '') if dataset_info else ''
    market_type = dataset_info.get('market_type') if (dataset_info and dataset_info.get('market_type')) else 'Default/unknown'
        
    market_config = MARKET_TYPE_THRESHOLDS.get(market_type, MARKET_TYPE_THRESHOLDS['Default/unknown'])
    curr_supp = market_config['min_support']
    curr_conf = market_config['min_confidence']
    fixed_lift = market_config['min_lift']
    
    FLOOR_SUPPORT = 0.0001
    FLOOR_CONFIDENCE = 0.02
    MIN_RULES_TARGET = 3

    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df_te = pd.DataFrame(te_ary, columns=te.columns_)

    num_tx = len(transactions)
    all_items = [item for sublist in transactions for item in sublist]
    num_items = len(set(all_items))
    
    if num_tx >= 500 or num_items >= 50:
        selected_algorithm = 'fpgrowth'
        algorithm_note = 'FP-Growth'
    else:
        selected_algorithm = 'apriori'
        algorithm_note = 'Apriori'

    best_rules = pd.DataFrame()
    best_frequent_itemsets = pd.DataFrame()
    used_supp = curr_supp
    used_conf = curr_conf
    step = 0

    while True:
        if selected_algorithm == 'apriori':
            frequent_itemsets = apriori(df_te, min_support=curr_supp, use_colnames=True)
        else:
            frequent_itemsets = fpgrowth(df_te, min_support=curr_supp, use_colnames=True)
            
        if frequent_itemsets.empty:
            current_rules = pd.DataFrame()
        else:
            current_rules = association_rules(frequent_itemsets, metric="confidence", min_threshold=curr_conf)
            if not current_rules.empty:
                current_rules = current_rules[current_rules['lift'] >= fixed_lift]
                
        if not current_rules.empty and (best_rules.empty or len(current_rules) > len(best_rules)):
            best_rules = current_rules
            best_frequent_itemsets = frequent_itemsets
            used_supp = curr_supp
            used_conf = curr_conf
            
        if len(current_rules) >= MIN_RULES_TARGET:
            best_rules = current_rules
            best_frequent_itemsets = frequent_itemsets
            used_supp = curr_supp
            used_conf = curr_conf
            break
            
        if curr_supp <= FLOOR_SUPPORT and curr_conf <= FLOOR_CONFIDENCE:
            break
            
        step += 1
        next_supp = max(curr_supp / 2.0, FLOOR_SUPPORT)
        next_conf = max(curr_conf - 0.05, FLOOR_CONFIDENCE)
        if next_supp == curr_supp and next_conf == curr_conf:
            break
        curr_supp = next_supp
        curr_conf = next_conf

    csv_lines = []
    csv_lines.append("=== SUMMARY STATISTICS & PARAMETERS ===")
    csv_lines.append(f"Total Purchases,{num_tx}")
    csv_lines.append(f"Different Items Sold Count,{num_items}")
    csv_lines.append(f"Algorithm Used,{algorithm_note}")
    csv_lines.append(f"Market Type,{market_type}")
    csv_lines.append(f"Final Support Threshold,{(used_supp * 100):.2f}%")
    csv_lines.append(f"Final Confidence Threshold,{(used_conf * 100):.2f}%")
    csv_lines.append("")

    csv_lines.append("=== COMMON ITEM COMBOS ===")
    csv_lines.append("Common Item Combos,Qty,N-Item Size,How Common This Is")
    if not best_frequent_itemsets.empty:
        for _, row in best_frequent_itemsets.iterrows():
            items = list(row['itemsets'])
            items_str = f'"{", ".join(items)}"'
            supp_val = float(row['support'])
            qty = int(round(supp_val * num_tx))
            size_str = f"{len(items)}-item set"
            supp_pct = f"{(supp_val * 100):.2f}%"
            csv_lines.append(f"{items_str},{qty},{size_str},{supp_pct}")
    else:
        csv_lines.append("No common item combos found,,,")
    csv_lines.append("")

    csv_lines.append("=== BUYING PATTERNS (RECOMMENDATIONS) ===")
    csv_lines.append("Frequently Bought Together,Buying Pattern,How Likely,How Strong the Link Is,Support,Confidence,Lift,Leverage,Conviction,Suggested Action")
    if not best_rules.empty:
        for _, row in best_rules.iterrows():
            ant = list(row['antecedents'])
            cons = list(row['consequents'])
            all_items = ant + cons
            fbt = f'"{ " + ".join(all_items) }"'
            pattern_str = f'"{", ".join(ant)} -> {", ".join(cons)}"'
            supp = float(row['support'])
            conf = float(row['confidence'])
            lift = float(row['lift'])
            lev = float(row.get('leverage', 0.0))
            conv = float(row.get('conviction', 0.0))
            if math.isinf(conv):
                conv = 999.0

            conf_pct = f"{(conf * 100):.1f}%"
            lift_str = f"{lift:.2f}"
            
            if conf >= 0.8:
                action = f"Create promotional bundle pairing '{', '.join(ant)}' with '{', '.join(cons)}'"
            elif conf >= 0.5:
                action = f"Cross-promote '{', '.join(cons)}' on detail pages for '{', '.join(ant)}'"
            else:
                action = f"Optimize placement: display '{', '.join(cons)}' near '{', '.join(ant)}'"

            csv_lines.append(f'{fbt},{pattern_str},{conf_pct},{lift_str},{(supp*100):.2f}%,{conf_pct},{lift_str},{lev:.4f},{conv:.2f},"{action}"')
    else:
        csv_lines.append("No buying patterns were found,,,,,,,,")

    return "\n".join(csv_lines)

@app.route('/api/admin/uploads/<int:upload_id>/export', methods=['GET'])
@app.route('/api/recommendations/export', methods=['GET'])
def export_recommendation_results(upload_id=None):
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    admin_err = _require_shop_admin(user_info)
    if admin_err:
        return admin_err

    target_id = upload_id or request.args.get('upload_id') or request.args.get('dataset_id')
    if not target_id:
        return jsonify({'error': 'upload_id is required'}), 400

    try:
        target_id = int(target_id)
    except (ValueError, TypeError):
        return jsonify({'error': 'Invalid upload_id parameter'}), 400

    dataset_info, auth_err = authorize_dataset_access(target_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    user_email = user_info['email']
    csv_payload = generate_recommendations_csv(target_id, user_email=user_email)

    filename = f"recommendation_results_{target_id}.csv"
    return Response(
        csv_payload,
        mimetype="text/csv",
        headers={
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )

@app.route('/api/history/<int:dataset_id>/activate', methods=['POST'])
@app.route('/api/datasets/<int:dataset_id>/activate', methods=['POST'])
def activate_dataset_endpoint(dataset_id):
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]

    dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    return jsonify({
        'message': f"Activated historical dataset: {dataset_info['name']}",
        'dataset': dataset_info
    })

@app.route('/api/products', methods=['GET', 'POST'])
def manage_products():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    if request.method == 'GET':
        products = db.get_products_for_user(user_email=user_email)
        return jsonify({'products': products})
    else:
        admin_err = _require_shop_admin(user_info)
        if admin_err:
            return admin_err

        params = request.json or {}
        name = params.get('name', '').strip()
        category = params.get('category', 'Uncategorized').strip()
        price = float(params.get('price', 0.0))
        stock = int(params.get('stock', 0))
        
        if not name:
            return jsonify({'error': 'Product name is required'}), 400
            
        success = db.add_product(name, category, price, stock)
        if not success:
            return jsonify({'error': 'Product name already exists'}), 400
            
        return jsonify({'message': f"Product '{name}' added successfully"}), 201

@app.route('/api/products/<int:product_id>', methods=['DELETE'])
def delete_product_endpoint(product_id):
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    admin_err = _require_shop_admin(user_info)
    if admin_err:
        return admin_err

    db.delete_product(product_id)
    return jsonify({'message': 'Product deleted successfully'})

@app.route('/api/trends', methods=['GET'])
def get_trends():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    dataset_id = request.args.get('dataset_id')
    if not dataset_id:
        return jsonify({'trends': []})

    dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    transactions_data = db.get_transactions_with_dates(user_email=user_email, dataset_id=dataset_id)
    if not transactions_data:
        return jsonify({'trends': []})
        
    date_entries = []
    for tx in transactions_data:
        raw_d = tx.get('date')
        if raw_d:
            clean_d = str(raw_d).split(' ')[0].split('T')[0]
            if len(clean_d) == 10 and clean_d[4] == '-' and clean_d[7] == '-':
                date_entries.append(clean_d)
            else:
                std_d = standardize_date_string(clean_d)
                if std_d:
                    date_entries.append(std_d)

    # Fallback to upload date if no transaction dates recorded in file
    if not date_entries and dataset_info.get('upload_date'):
        up_d = str(dataset_info['upload_date']).split(' ')[0].split('T')[0]
        date_entries = [up_d] * len(transactions_data)

    if not date_entries:
        return jsonify({'trends': []})

    df_tx = pd.DataFrame({'date': date_entries})
    grouped = df_tx.groupby('date').size().reset_index(name='count').sort_values('date')
    
    trends = []
    for _, row in grouped.iterrows():
        d_str = str(row['date'])
        try:
            d_obj = datetime.strptime(d_str, '%Y-%m-%d')
            disp = d_obj.strftime('%b %d')
            full = d_obj.strftime('%b %d, %Y')
        except Exception:
            disp = d_str
            full = d_str
        trends.append({
            'date': d_str,
            'display_date': disp,
            'full_date': full,
            'count': int(row['count'])
        })
        
    return jsonify({'trends': trends})

@app.route('/api/benchmark', methods=['POST'])
def run_benchmark():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    admin_err = _require_shop_admin(user_info)
    if admin_err:
        return admin_err
    user_email = user_info['email']

    params = request.json or {}
    dataset_id = params.get('dataset_id') or request.args.get('dataset_id')
    if not dataset_id:
        datasets = db.get_datasets(user_email=user_email)
        if datasets:
            dataset_id = datasets[0]['id']
        else:
            return jsonify({'error': 'No dataset available for benchmark. Please upload a dataset first.'}), 400

    dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
    if auth_err:
        return auth_err[0], auth_err[1]

    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if not transactions or len(transactions) < 5:
        return jsonify({'error': 'Please upload a larger dataset first to run the performance benchmark (min 5 transactions).'}), 400
        
    market_type = dataset_info.get('market_type') if (dataset_info and dataset_info.get('market_type')) else 'Default/unknown'
        
    market_config = MARKET_TYPE_THRESHOLDS.get(market_type, MARKET_TYPE_THRESHOLDS['Default/unknown'])
    min_support = market_config['min_support']
    min_confidence = market_config['min_confidence']
        
    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)
    
    apriori_times = []
    apriori_memories = []
    fpgrowth_times = []
    fpgrowth_memories = []
    
    N = 20 # 20 iterations
    
    # Benchmarking Apriori
    for _ in range(N):
        tracemalloc.start()
        t0 = time.time()
        try:
            freq = apriori(df, min_support=min_support, use_colnames=True)
            _ = association_rules(freq, metric="confidence", min_threshold=min_confidence)
        except Exception:
            pass
        t1 = time.time()
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        apriori_times.append(t1 - t0)
        apriori_memories.append(peak / (1024 * 1024)) # Convert to MB
        
    # Benchmarking FP-Growth
    for _ in range(N):
        tracemalloc.start()
        t0 = time.time()
        try:
            freq = fpgrowth(df, min_support=min_support, use_colnames=True)
            _ = association_rules(freq, metric="confidence", min_threshold=min_confidence)
        except Exception:
            pass
        t1 = time.time()
        _, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        
        fpgrowth_times.append(t1 - t0)
        fpgrowth_memories.append(peak / (1024 * 1024)) # Convert to MB
        
    # Paired T-test calculations for execution time
    time_diffs = [a - b for a, b in zip(apriori_times, fpgrowth_times)]
    mean_time_diff = sum(time_diffs) / N
    var_time_diff = sum((d - mean_time_diff) ** 2 for d in time_diffs) / (N - 1) if N > 1 else 0
    std_err_time = math.sqrt(var_time_diff) / math.sqrt(N) if var_time_diff > 0 else 0
    t_stat_time = mean_time_diff / std_err_time if std_err_time > 0 else 0.0
    
    df_val = N - 1
    z_time = t_stat_time * (1.0 - 0.25 / df_val) / math.sqrt(1.0 + (t_stat_time * t_stat_time) / (2.0 * df_val)) if t_stat_time != 0 else 0
    
    def normal_cdf(x):
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))
        
    p_value_time = 2.0 * (1.0 - normal_cdf(abs(z_time)))
    
    # Paired T-test calculations for memory usage
    mem_diffs = [a - b for a, b in zip(apriori_memories, fpgrowth_memories)]
    mean_mem_diff = sum(mem_diffs) / N
    var_mem_diff = sum((d - mean_mem_diff) ** 2 for d in mem_diffs) / (N - 1) if N > 1 else 0
    std_err_mem = math.sqrt(var_mem_diff) / math.sqrt(N) if var_mem_diff > 0 else 0
    t_stat_mem = mean_mem_diff / std_err_mem if std_err_mem > 0 else 0.0
    
    z_mem = t_stat_mem * (1.0 - 0.25 / df_val) / math.sqrt(1.0 + (t_stat_mem * t_stat_mem) / (2.0 * df_val)) if t_stat_mem != 0 else 0
    p_value_mem = 2.0 * (1.0 - normal_cdf(abs(z_mem)))
    
    avg_time_apriori = sum(apriori_times) / N
    avg_mem_apriori = sum(apriori_memories) / N
    avg_time_fpgrowth = sum(fpgrowth_times) / N
    avg_mem_fpgrowth = sum(fpgrowth_memories) / N
    
    return jsonify({
        'apriori': {
            'times': apriori_times,
            'memories': apriori_memories,
            'avg_time': avg_time_apriori,
            'avg_mem': avg_mem_apriori
        },
        'fpgrowth': {
            'times': fpgrowth_times,
            'memories': fpgrowth_memories,
            'avg_time': avg_time_fpgrowth,
            'avg_mem': avg_mem_fpgrowth
        },
        't_test_time': {
            't_statistic': t_stat_time,
            'p_value': p_value_time,
            'mean_difference': mean_time_diff,
            'standard_error': std_err_time,
            'is_significant': p_value_time < 0.05
        },
        't_test_mem': {
            't_statistic': t_stat_mem,
            'p_value': p_value_mem,
            'mean_difference': mean_mem_diff,
            'standard_error': std_err_mem,
            'is_significant': p_value_mem < 0.05
        },
        'adaptive_thresholds': {
            'market_type': market_type,
            'min_support': min_support,
            'min_confidence': min_confidence
        },
        'message': 'Benchmark completed successfully over 20 iterations.'
    })

@app.route('/api/clear', methods=['POST'])
def clear_data():
    data_store['last_rules'] = None
    return jsonify({
        'message': 'Data cleared successfully',
        'transaction_count': 0,
        'unique_items': 0
    })

# ── Invitation Pipeline (v2) ──────────────────────────────────────────────────
from urllib.parse import urlparse, parse_qs

def _extract_token(raw):
    """
    Accept either a bare token string or a full URL containing ?token=<value>.
    Returns the token string, or None if nothing usable is found.
    """
    raw = (raw or '').strip()
    if not raw:
        return None
    # If it looks like a URL, try to pull ?token= out of the query string
    if raw.startswith('http://') or raw.startswith('https://') or '?' in raw:
        try:
            parsed = urlparse(raw)
            qs = parse_qs(parsed.query)
            tokens = qs.get('token', [])
            if tokens:
                return tokens[0].strip()
        except Exception:
            pass
    # Treat as raw token
    return raw


# ── v1 versioned endpoints ────────────────────────────────────────────────────

@app.route('/api/v1/invitations/generate', methods=['POST'])
def v1_generate_invitation():
    """
    Shop admin sends an invitation to a specific email address.
    Creates an invitation row, an in-app notification for the invitee,
    and sends an email with the accept link.
    Authorization is based solely on role='shop_admin' — not on email strings.
    """
    user_info = get_current_user()
    err = _require_shop_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'error': 'No store associated with your account.'}), 400

    params         = request.json or {}
    invited_email  = params.get('email', '').strip().lower()
    max_uses       = int(params.get('max_uses', 1))

    if not invited_email:
        return jsonify({'error': 'Email address is required to send an invitation.'}), 400
    if '@' not in invited_email:
        return jsonify({'error': 'Please provide a valid email address.'}), 400

    token      = secrets.token_hex(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(hours=48)).strftime('%Y-%m-%d %H:%M:%S')

    db.create_invitation(
        invited_email=invited_email,
        token=token,
        store_id=store_id,
        expires_at=expires_at,
        invited_by=user_info['email'],
        role='team_member',
        max_uses=max_uses
    )

    # Get the invitation id for the notification reference
    inv = db.get_invitation_by_token(token)
    inv_id = inv['id'] if inv else None

    # Create in-app notification for the invited user (if they have an account)
    invitee = db.get_user(invited_email)
    if invitee and inv_id:
        db.create_notification(invited_email, 'invitation_received', reference_id=inv_id)

    # Send email (falls back to console log in dev)
    store      = db.get_store_by_id(store_id)
    store_name = store['name'] if store else 'the store'
    invite_url = f'{request.host_url.rstrip("/")}/join?token={token}'
    send_invitation_email(
        to_email       = invited_email,
        store_name     = store_name,
        invite_url     = invite_url,
        invited_by_name= user_info.get('name', user_info['email'])
    )

    # Audit log
    _log_current_user_action('invitation_sent', {
        'invited_email': invited_email,
        'store_id':      store_id,
        'token_prefix':  token[:8],
        'expires_at':    expires_at
    })

    return jsonify({
        'message': f'Invitation sent to {invited_email}',
        'invite_url': f'/join?token={token}',
        'token': token,
        'expires_at': expires_at,
        'max_uses': max_uses
    }), 201


@app.route('/api/v1/invitations/consume', methods=['POST'])
def v1_consume_invitation():
    """
    Authenticated member submits a token (raw or full URL) to join a store via email link.
    Validates: active, not expired, under usage limit.
    """
    member_email = get_current_user_email()
    if not member_email:
        return jsonify({'error': 'You must be logged in to consume an invitation.'}), 401

    params    = request.json or {}
    raw_input = params.get('token') or params.get('token_or_url') or ''
    token     = _extract_token(raw_input)
    if not token:
        return jsonify({'error': 'A token or invitation link is required.'}), 400

    inv = db.get_invitation_by_token(token)
    if not inv:
        return jsonify({'error': 'Invalid invitation token.'}), 403

    max_uses   = inv.get('max_uses', 1) or 1
    uses_count = inv.get('uses_count', 0) or 0
    is_active  = inv.get('is_active', 1)
    if not is_active or uses_count >= max_uses:
        return jsonify({'error': 'This invitation link has already been fully used.'}), 403

    try:
        expires_at = datetime.strptime(inv['expires_at'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'This invitation link has expired (valid for 48 hours).'}), 403
    except Exception:
        return jsonify({'error': 'Could not validate token expiry.'}), 500

    member_user = db.get_user(member_email)
    if not member_user:
        return jsonify({'error': 'User account not found. Please register first.'}), 404

    store_id = db.consume_invitation(token, member_email)
    if not store_id:
        return jsonify({'error': 'Failed to consume invitation. Please try again.'}), 500

    store        = db.get_store_by_id(store_id)
    updated_user = db.get_user(member_email)

    # Mark related notification as read
    inv_id = inv.get('id')
    if inv_id:
        notifs = db.get_notifications_for_user(member_email, include_read=True)
        for n in notifs:
            if n.get('reference_id') == inv_id:
                db.mark_notification_read(n['id'], member_email)
                break

    # Notify the store admin that member accepted
    store_admin_email = inv.get('invited_by')
    if store_admin_email:
        db.create_notification(store_admin_email, 'invitation_accepted', reference_id=inv_id)

    _log_current_user_action('invitation_accepted', {
        'store_id':   store_id,
        'store_name': store['name'] if store else None,
        'token_prefix': token[:8]
    })

    return jsonify({
        'message': 'You have successfully joined the store.',
        'token': f'mock-jwt-token-{member_email}',
        'user': {
            'email':        member_email,
            'name':         updated_user['name'],
            'role':         updated_user.get('role', 'team_member'),
            'account_type': updated_user.get('account_type', 'member'),
            'status':       'active',
            'store_id':     store_id,
            'store_name':   store['name'] if store else None
        }
    })


@app.route('/api/v1/invitations/<int:invitation_id>/accept', methods=['POST'])
def v1_accept_invitation_by_id(invitation_id):
    """
    Team member accepts an invitation directly from the notification bell.
    No token needed — uses the invitation database ID.
    """
    member_email = get_current_user_email()
    if not member_email:
        return jsonify({'error': 'Authentication required.'}), 401

    inv = db.get_invitation_by_id(invitation_id)
    if not inv:
        return jsonify({'error': 'Invitation not found.'}), 404

    # Verify this invite was meant for this user
    if inv.get('invited_email') and inv['invited_email'].lower() != member_email.lower():
        return jsonify({'error': 'This invitation was not sent to your account.'}), 403

    # Expiry check
    try:
        expires_at = datetime.strptime(inv['expires_at'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'This invitation has expired (valid for 48 hours).'}), 403
    except Exception:
        return jsonify({'error': 'Could not validate expiry.'}), 500

    store_id = db.consume_invitation_by_id(invitation_id, member_email)
    if not store_id:
        return jsonify({'error': 'Failed to accept invitation. It may have already been used.'}), 400

    store        = db.get_store_by_id(store_id)
    updated_user = db.get_user(member_email)

    # Mark notification as read
    notifs = db.get_notifications_for_user(member_email, include_read=True)
    for n in notifs:
        if n.get('reference_id') == invitation_id:
            db.mark_notification_read(n['id'], member_email)
            break

    # Notify the admin
    store_admin_email = inv.get('invited_by')
    if store_admin_email:
        db.create_notification(store_admin_email, 'invitation_accepted', reference_id=invitation_id)

    _log_current_user_action('invitation_accepted', {
        'invitation_id': invitation_id,
        'store_id':      store_id,
        'store_name':    store['name'] if store else None
    })

    return jsonify({
        'message': f'You have joined {store["name"] if store else "the store"} successfully.',
        'token': f'mock-jwt-token-{member_email}',
        'user': {
            'email':        member_email,
            'name':         updated_user['name'],
            'role':         updated_user.get('role', 'team_member'),
            'account_type': updated_user.get('account_type', 'member'),
            'status':       'active',
            'store_id':     store_id,
            'store_name':   store['name'] if store else None
        }
    })


@app.route('/api/v1/invitations/<int:invitation_id>/decline', methods=['POST'])
def v1_decline_invitation_by_id(invitation_id):
    """
    Team member declines an invitation from the notification bell.
    """
    member_email = get_current_user_email()
    if not member_email:
        return jsonify({'error': 'Authentication required.'}), 401

    inv = db.get_invitation_by_id(invitation_id)
    if not inv:
        return jsonify({'error': 'Invitation not found.'}), 404

    if inv.get('invited_email') and inv['invited_email'].lower() != member_email.lower():
        return jsonify({'error': 'This invitation was not sent to your account.'}), 403

    db.decline_invitation_by_id(invitation_id)

    # Mark notification as read
    notifs = db.get_notifications_for_user(member_email, include_read=True)
    for n in notifs:
        if n.get('reference_id') == invitation_id:
            db.mark_notification_read(n['id'], member_email)
            break

    # Notify the admin of the decline
    store_admin_email = inv.get('invited_by')
    if store_admin_email:
        db.create_notification(store_admin_email, 'invitation_declined', reference_id=invitation_id)

    _log_current_user_action('invitation_declined', {
        'invitation_id': invitation_id,
        'store_id':      inv.get('store_id')
    })

    return jsonify({'message': 'Invitation declined.'})


# ── Legacy aliases (backward compat) ─────────────────────────────────────────

@app.route('/api/invitations/create', methods=['POST'])
def create_invitation():
    """Legacy alias → v1_generate_invitation."""
    return v1_generate_invitation()


@app.route('/api/invitations/accept', methods=['POST'])
def accept_invitation():
    """Legacy alias — still email-aware for the old JoinPage flow."""
    params = request.json or {}
    token = _extract_token(params.get('token', ''))
    if not token:
        return jsonify({'error': 'Token is required'}), 400

    inv = db.get_invitation_by_token(token)
    if not inv:
        return jsonify({'error': 'Invalid invitation token'}), 403

    max_uses   = inv.get('max_uses', 1) or 1
    uses_count = inv.get('uses_count', 0) or 0
    is_active  = inv.get('is_active', 1)
    if not is_active or uses_count >= max_uses:
        return jsonify({'error': 'This invitation link has already been used'}), 403

    try:
        expires_at = datetime.strptime(inv['expires_at'], '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > expires_at:
            return jsonify({'error': 'This invitation link has expired (valid for 48 hours)'}), 403
    except Exception:
        return jsonify({'error': 'Could not validate token expiry'}), 500

    member_email = get_current_user_email()
    if not member_email:
        store = db.get_store_by_id(inv['store_id'])
        return jsonify({
            'requires_login': True,
            'store_id': inv['store_id'],
            'store_name': store['name'] if store else None,
            'invited_email': inv.get('email')
        })

    member_user = db.get_user(member_email)
    if not member_user:
        return jsonify({'error': 'User account not found. Please register first.'}), 404

    store_id = db.consume_invitation(token, member_email)
    if not store_id:
        return jsonify({'error': 'Failed to accept invitation'}), 500

    store = db.get_store_by_id(store_id)
    updated_user = db.get_user(member_email)
    return jsonify({
        'message': 'Invitation accepted successfully. Your account is now active.',
        'token': f'mock-jwt-token-{member_email}',
        'user': {
            'email': member_email,
            'name': updated_user['name'],
            'role': updated_user['role'],
            'account_type': 'member',
            'status': 'active',
            'store_id': store_id,
            'store_name': store['name'] if store else None
        }
    })


@app.route('/api/invitations', methods=['GET'])
def list_invitations():
    """Admin lists active invitations for their store."""
    user_info = get_current_user()
    err = _require_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'invitations': []})

    invitations = db.get_pending_invitations(store_id)
    return jsonify({'invitations': invitations})



# ── Notifications ─────────────────────────────────────────────────────────────

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    """Return unread notifications for the current user."""
    user_email = get_current_user_email()
    if not user_email:
        return jsonify({'error': 'Authentication required.'}), 401
    include_read = request.args.get('include_read', 'false').lower() == 'true'
    notifs = db.get_notifications_for_user(user_email, include_read=include_read)
    unread_count = db.get_unread_notification_count(user_email)
    return jsonify({'notifications': notifs, 'unread_count': unread_count})


@app.route('/api/notifications/<int:notification_id>/read', methods=['PATCH', 'POST'])
def mark_notification_read_endpoint(notification_id):
    """Mark a single notification as read."""
    user_email = get_current_user_email()
    if not user_email:
        return jsonify({'error': 'Authentication required.'}), 401
    db.mark_notification_read(notification_id, user_email)
    return jsonify({'message': 'Notification marked as read.'})


@app.route('/api/notifications/read-all', methods=['PATCH', 'POST'])
def mark_all_notifications_read_endpoint():
    """Mark all notifications for the current user as read."""
    user_email = get_current_user_email()
    if not user_email:
        return jsonify({'error': 'Authentication required.'}), 401
    db.mark_all_notifications_read(user_email)
    return jsonify({'message': 'All notifications marked as read.'})


# ── Activity Audit Log ────────────────────────────────────────────────────────

@app.route('/api/activity-logs', methods=['GET'])
def get_activity_logs():
    """Return audit logs scoped strictly to the admin's store."""
    user_info = get_current_user()
    err = _require_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'logs': [], 'users': []})

    user_email_filter = request.args.get('user_email') or None
    start_date = request.args.get('start_date') or None
    end_date = request.args.get('end_date') or None

    logs = db.get_activity_logs(
        store_id=store_id,
        user_email_filter=user_email_filter,
        start_date=start_date,
        end_date=end_date,
        limit=200
    )

    # Parse the details JSON string back to dict for the response
    for log in logs:
        if log.get('details'):
            try:
                log['details'] = json.loads(log['details'])
            except (json.JSONDecodeError, TypeError):
                pass

    users = db.get_store_users_for_filter(store_id)
    return jsonify({'logs': logs, 'users': users})


@app.route('/api/store/members', methods=['GET'])
def get_store_members():
    """Return team members of the current admin's store."""
    user_info = get_current_user()
    err = _require_admin(user_info)
    if err:
        return err

    store_id = _get_store_id_for_user(user_info)
    if not store_id:
        return jsonify({'members': []})

    members = db.get_store_members(store_id)
    return jsonify({'members': members})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
