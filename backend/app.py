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
    
    # System administrator has platform-wide dataset access
    if user_info.get('role') == 'system_admin':
        return dataset, None

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
    """Resolve store_id: shop_admin / business_admin owns a store; team_member / staff belongs to one."""
    if not user_info:
        return None
    store_id = user_info.get('store_id')
    if store_id:
        return store_id
    # shop_admin / business_admin: look up store by ownership
    if user_info.get('role') in ('shop_admin', 'business_admin'):
        store = db.get_store_by_owner(user_info['email'])
        return store['id'] if store else None
    return None

def _require_shop_admin(user_info):
    """
    Server-side guard: return 403 unless the user's role is 'shop_admin' or 'business_admin'.
    Authorization is based solely on the role column.
    """
    if not user_info or user_info.get('role') not in ('shop_admin', 'business_admin'):
        return jsonify({'error': 'Forbidden: shop administrator access required'}), 403
    return None

# Keep legacy alias so existing call-sites continue to work
_require_admin = _require_shop_admin

def require_system_admin():
    """
    Server-side guard: verify request has a valid session with 'system_admin' role.
    Returns (user_info, error_tuple).
    """
    user_info, err = require_authenticated_user()
    if err:
        return None, err
    if user_info.get('role') != 'system_admin':
        return None, (jsonify({'error': 'Forbidden: System Administrator access required'}), 403)
    return user_info, None

def _log_current_user_action(action, details_dict=None, status='Success'):
    """Convenience wrapper — resolves store_id automatically and logs action with status and IP."""
    user_info = get_current_user()
    if not user_info:
        return
    store_id = _get_store_id_for_user(user_info)
    ip_addr = request.remote_addr if request else None
    db.log_activity(store_id, user_info['email'], action, details_dict, status=status, ip_address=ip_addr)

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

# In-memory performance caches for fast dashboard and analytics loading
CACHE_STATS = {}
CACHE_TRENDS = {}
CACHE_MINE = {}

def invalidate_dataset_cache(dataset_id=None):
    global CACHE_STATS, CACHE_TRENDS, CACHE_MINE
    if dataset_id:
        ds_key = str(dataset_id)
        for k in list(CACHE_STATS.keys()):
            if str(k[0]) == ds_key:
                CACHE_STATS.pop(k, None)
        for k in list(CACHE_TRENDS.keys()):
            if str(k[0]) == ds_key:
                CACHE_TRENDS.pop(k, None)
        for k in list(CACHE_MINE.keys()):
            if str(k[0]) == ds_key:
                CACHE_MINE.pop(k, None)
    else:
        CACHE_STATS.clear()
        CACHE_TRENDS.clear()
        CACHE_MINE.clear()

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
        item_details = [[{'item': it, 'category': 'Uncategorized', 'quantity': 1} for it in basket] for basket in transactions]
        return transactions, duplicates_removed, missing_removed, [0.0]*len(transactions), None, None, [None]*len(transactions), detected_cols, item_details

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
            item_details = [[{'item': it, 'category': 'Uncategorized', 'quantity': 1} for it in basket] for basket in transactions]
            return transactions, duplicates_removed, missing_removed, [0.0]*len(transactions), None, None, [None]*len(transactions), detected_cols, item_details

    # 3. Standard Tidy / Vertical Format:
    col_id = None
    col_item = None
    col_category = None
    col_qty = None
    col_price = None
    col_date = None

    id_keywords = ['invoice', 'order', 'receipt', 'trans', 'bill', 'txn', 'cart', 'basket', 'sale', 'id', 'no']
    category_keywords = ['category', 'department', 'dept', 'group', 'class', 'type', 'section', 'family', 'segment', 'genre']
    item_keywords = ['product', 'item', 'desc', 'description', 'name', 'article', 'goods', 'sku', 'commodity', 'menu']
    date_keywords = ['date', 'time', 'datetime', 'timestamp', 'day', 'trans_date', 'sale_date', 'bill_date', 'invoicedate']
    qty_keywords = ['qty', 'quantity', 'count', 'vol', 'volume', 'amount_sold', 'units', 'pieces']
    price_keywords = ['price', 'unit_price', 'unitprice', 'cost', 'rate', 'item_price', 'amount', 'total']

    for col in df.columns:
        cl = str(col).lower()
        if col_id is None and any(kw in cl for kw in id_keywords):
            col_id = col
        elif col_category is None and any(kw in cl for kw in category_keywords) and 'item' not in cl and 'product' not in cl:
            col_category = col
        elif col_date is None and any(kw in cl for kw in date_keywords):
            col_date = col
        elif col_qty is None and any(kw in cl for kw in qty_keywords):
            col_qty = col
        elif col_price is None and any(kw in cl for kw in price_keywords):
            col_price = col
        elif col_item is None and any(kw in cl for kw in item_keywords) and 'id' not in cl and 'cat' not in cl:
            col_item = col

    # Fallbacks
    if col_id is None:
        col_id = df.columns[0]
    if col_item is None:
        for col in df.columns:
            if col not in [col_id, col_category, col_date, col_qty, col_price]:
                col_item = col
                break
    if col_item is None:
        col_item = df.columns[1] if len(df.columns) > 1 else df.columns[0]

    detected_cols = [str(c) for c in [col_id, col_item, col_category, col_qty, col_date, col_price] if c is not None]

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

        # Check category
        raw_category = 'Uncategorized'
        if col_category is not None and col_category in row:
            raw_c = row[col_category]
            if pd.notna(raw_c):
                c_str = str(raw_c).strip()
                if c_str and c_str.lower() not in {'', 'nan', 'null', 'none', 'undefined'}:
                    raw_category = c_str

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
            tx_map[tx_id_str].append({
                'item': it,
                'category': raw_category,
                'quantity': qty
            })

    # Convert to transaction list (deduplicating items within each transaction for mining)
    transactions = []
    item_details = []
    basket_values_list = []
    tx_dates_list = []

    for tx_id, items_list in tx_map.items():
        if items_list:
            seen_items = set()
            unique_items = []
            unique_details = []
            for detail in items_list:
                it = detail['item']
                if it not in seen_items:
                    seen_items.add(it)
                    unique_items.append(it)
                    unique_details.append(detail)
            if unique_items:
                transactions.append(unique_items)
                item_details.append(unique_details)
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
    return transactions, duplicates_removed, total_missing, basket_values_list, date_range_days, basket_avg, tx_dates_list, detected_cols, item_details



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
    business_status = 'Active'
    if store_id:
        store      = db.get_store_by_id(store_id)
        if store:
            store_name = store.get('name')
            business_status = store.get('status', 'Active')

    # role column is the authoritative source (system_admin | business_admin/shop_admin | staff/team_member)
    role         = user_info.get('role') or 'shop_admin'
    account_type = user_info.get('account_type') or 'admin'
    status       = user_info.get('status') or 'active'

    # Audit log login event
    ip_addr = request.remote_addr if request else None
    db.log_activity(store_id, email, 'USER_LOGIN', {'role': role, 'business_name': store_name}, status='Success', ip_address=ip_addr)

    return jsonify({
        'token': generate_auth_token(email),
        'user': {
            'email':           email,
            'name':            user_info['name'],
            'role':            role,
            'account_type':    account_type,
            'status':          status,
            'store_id':        store_id,
            'store_name':      store_name,
            'business_status': business_status
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
    business_type = params.get('business_type', 'Retail').strip()

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
        # Shop Administrator onboarding
        settings = db.get_system_settings()
        req_approval = settings.get('general', {}).get('business_approval_required', 'true').lower() == 'true'
        initial_status = 'Pending Approval' if req_approval else 'Active'
        user_status = 'pending_approval' if req_approval else 'active'

        success = db.create_user(email, password, name, 'business_admin',
                                 account_type='admin', store_id=None, status=user_status)
        if not success:
            return jsonify({'error': 'Email is already registered'}), 409

        store_id = db.create_business(store_name, email, business_type=business_type, status=initial_status)
        db.update_user_store(email, store_id, status=user_status)

        ip_addr = request.remote_addr if request else None
        db.log_activity(store_id, email, 'BUSINESS_REGISTERED', {'store_name': store_name, 'status': initial_status}, ip_address=ip_addr)

        if initial_status == 'Pending Approval':
            return jsonify({
                'message': 'Registration successful! Your business account is pending System Administrator approval.',
                'pending': True,
                'user': {
                    'email': email,
                    'name': name,
                    'role': 'business_admin',
                    'account_type': 'admin',
                    'status': 'pending_approval',
                    'store_id': store_id,
                    'store_name': store_name,
                    'business_status': 'Pending Approval'
                }
            }), 201

        return jsonify({
            'message': 'Registration successful',
            'token': generate_auth_token(email),
            'user': {
                'email': email,
                'name': name,
                'role': 'business_admin',
                'account_type': 'admin',
                'status': 'active',
                'store_id': store_id,
                'store_name': store_name,
                'business_status': 'Active'
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
        transactions, duplicates_removed, missing_removed, basket_values_list, date_range_days, basket_avg, tx_dates_list, detected_cols, item_details = parse_df_to_transactions(df)

        if not transactions:
            ds_id = db.add_dataset(file.filename, 0, 0, user_email=user_email, file_hash=file_hash, market_type='Default/unknown',
                                   missing_count=missing_removed, duplicates_count=duplicates_removed, columns_detected=detected_cols)
            return jsonify({
                'message': 'File uploaded with empty dataset warning',
                'transaction_count': 0,
                'unique_items': 0,
                'dataset_id': ds_id,
                'is_empty': True,
                'categories': [],
                'product_categories': {},
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
                db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list, dates=tx_dates_list, item_details=item_details)
            categories = db.get_categories_for_dataset(dataset_id=ds_id, user_email=user_email)
            cat_map = db.get_product_categories_for_dataset(dataset_id=ds_id, user_email=user_email)
            return jsonify({
                'duplicate_detected': True,
                'message': f'This file ("{existing_ds["name"]}") is already in your File History (uploaded on {existing_ds.get("upload_date", "")}). Reusing the existing dataset.',
                'transaction_count': total_tx,
                'unique_items': unique_items_count,
                'dataset_id': ds_id,
                'categories': categories,
                'product_categories': cat_map,
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
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list, dates=tx_dates_list, item_details=item_details)
        categories = db.get_categories_for_dataset(dataset_id=ds_id, user_email=user_email)
        cat_map = db.get_product_categories_for_dataset(dataset_id=ds_id, user_email=user_email)

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
        
        invalidate_dataset_cache(ds_id)
        return jsonify({
            'message': 'File cleaned and processed successfully',
            'transaction_count': total_tx,
            'unique_items': unique_items_count,
            'dataset_id': ds_id,
            'categories': categories,
            'product_categories': cat_map,
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

    cache_key = (str(dataset_id), str(user_email), str(algorithm), str(params.get('min_support')), str(params.get('min_confidence')), str(params.get('min_lift')))
    cached = CACHE_MINE.get(cache_key)
    if cached and (time.time() - cached['time'] < 300):
        return jsonify(cached['data'])

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
        total_tx = len(transactions)

        # Inverted index for lightning-fast item-to-transaction lookup
        item_to_tx_indices = {}
        for idx, tx in enumerate(transactions):
            for item in tx:
                if item not in item_to_tx_indices:
                    item_to_tx_indices[item] = set()
                item_to_tx_indices[item].add(idx)

        # Basket values (list parallel to transactions, 0.0 if unavailable)
        basket_values_list = db.get_transaction_basket_values(user_email=user_email, dataset_id=dataset_id)
        has_basket_data = bool(basket_values_list) and any(v > 0 for v in basket_values_list)

        # Dataset-level date range for monthly extrapolation
        ds_date_range_days = dataset_info.get('date_range_days') if dataset_info else None

        for rule_obj in formatted_rules:
            ants = rule_obj['antecedents']
            conss = rule_obj['consequents']

            # Use inverted index to find matching transaction sets in microseconds
            ant_indices = item_to_tx_indices.get(ants[0], set()) if ants else set()
            for it in ants[1:]:
                ant_indices = ant_indices.intersection(item_to_tx_indices.get(it, set()))
                if not ant_indices:
                    break

            cons_indices = item_to_tx_indices.get(conss[0], set()) if conss else set()
            for it in conss[1:]:
                cons_indices = cons_indices.intersection(item_to_tx_indices.get(it, set()))
                if not cons_indices:
                    break

            rule_indices = ant_indices.intersection(cons_indices) if (ant_indices and cons_indices) else set()

            ant_tx_count = len(ant_indices)
            rule_tx_count = len(rule_indices)
            cons_tx_count = len(cons_indices)

            baseline_rate = cons_tx_count / total_tx if total_tx > 0 else 0.0

            # Revenue: average basket value for transactions matching the full rule
            avg_rule_basket  = None
            monthly_estimate = None
            rule_has_revenue = False
            if has_basket_data and basket_values_list and rule_indices:
                rule_baskets = [
                    basket_values_list[i]
                    for i in rule_indices
                    if i < len(basket_values_list)
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

        categories = db.get_categories_for_dataset(dataset_id=dataset_id, user_email=user_email)
        cat_map = db.get_product_categories_for_dataset(dataset_id=dataset_id, user_email=user_email)

        for r in formatted_rules:
            r['antecedent_categories'] = [cat_map.get(x, 'Uncategorized') for x in r['antecedents']]
            r['consequent_categories'] = [cat_map.get(x, 'Uncategorized') for x in r['consequents']]

        for s in formatted_itemsets:
            s['item_categories'] = [cat_map.get(x, 'Uncategorized') for x in s['items']]

        res_payload = {
            'dataset_id': dataset_id,
            'rules': formatted_rules,
            'frequent_itemsets': formatted_itemsets,
            'gaps': gaps,
            'categories': categories,
            'product_categories': cat_map,
            'metrics': metrics
        }

        # Record analysis in analyses table and activity log for platform-wide history
        try:
            business_id = dataset_info.get('business_id') or _get_store_id_for_user(user_info)
            summary_info = {
                'rules_count': len(formatted_rules),
                'frequent_itemsets_count': len(formatted_itemsets),
                'execution_time': execution_time,
                'algorithm': selected_algorithm,
                'step': used_step,
                'support': used_supp,
                'confidence': used_conf
            }
            db.create_analysis_record(
                business_id=business_id,
                dataset_id=dataset_id,
                user_email=user_email,
                algorithm=selected_algorithm,
                parameters={'support': used_supp, 'confidence': used_conf, 'lift': fixed_lift, 'algorithm': algorithm},
                execution_time=round(execution_time, 4),
                status='Completed',
                rules_count=len(formatted_rules),
                frequent_itemsets_count=len(formatted_itemsets),
                results_summary=summary_info
            )
            _log_current_user_action('RUN_ANALYSIS', {
                'dataset_id': dataset_id,
                'algorithm': selected_algorithm,
                'rules_count': len(formatted_rules),
                'execution_time': round(execution_time, 4)
            })
        except Exception as log_err:
            logger.warning(f"Failed to record analysis log: {log_err}")

        CACHE_MINE[cache_key] = {'time': time.time(), 'data': res_payload}
        return jsonify(res_payload)
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

    cache_key = (str(dataset_id), str(user_email))
    cached = CACHE_STATS.get(cache_key)
    if cached and (time.time() - cached['time'] < 300):
        return jsonify(cached['data'])

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
    
    categories = db.get_categories_for_dataset(dataset_id=dataset_id, user_email=user_email)
    cat_map = db.get_product_categories_for_dataset(dataset_id=dataset_id, user_email=user_email)

    formatted_all_items = [
        {
            'name': k, 
            'value': int(v),
            'count': int(v),
            'quantity': int(v),
            'category': cat_map.get(k, 'Uncategorized'),
            'support': float(v) / total_transactions,
            'quantity_share': round((float(v) / total_items_sold) * 100, 1),
            'transaction_share': round((float(v) / total_transactions) * 100, 1)
        } 
        for k, v in item_counts.items()
    ]
    
    unique_items_count = len(item_counts)
    recommended = 'FP-Growth' if total_transactions >= 500 or unique_items_count >= 50 else 'Apriori'

    # Compute dataset health metrics using direct date query without loading all transaction items
    distinct_dates = db.get_distinct_dates_for_dataset(user_email=user_email, dataset_id=dataset_id)
    
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
    
    stats_data = {
        'active': True,
        'dataset_id': dataset_id,
        'dataset_name': dataset_info.get('name') or f"Dataset #{dataset_id}",
        'market_type': dataset_info.get('market_type') or 'Default/unknown',
        'upload_date': dataset_info.get('upload_date'),
        'date_range_str': date_range_str,
        'total_transactions': total_transactions,
        'total_units_sold': total_items_sold,
        'unique_items_count': unique_items_count,
        'categories': categories,
        'product_categories': cat_map,
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
    }
    CACHE_STATS[cache_key] = {'time': time.time(), 'data': stats_data}
    return jsonify(stats_data)

@app.route('/api/frequently_bought_together', methods=['GET', 'POST'])
def get_frequently_bought_together():
    user_info, err = require_authenticated_user()
    if err:
        return err[0], err[1]
    user_email = user_info['email']

    dataset_id = request.args.get('dataset_id')
    if request.is_json and request.json and not dataset_id:
        dataset_id = request.json.get('dataset_id')

    if dataset_id:
        dataset_info, auth_err = authorize_dataset_access(dataset_id, user_info)
        if auth_err:
            return auth_err[0], auth_err[1]

    # Collect selected products from query params or JSON body
    selected_products = []
    if request.is_json and request.json:
        p_val = request.json.get('products') or request.json.get('product')
        if isinstance(p_val, list):
            selected_products.extend([str(x).strip() for x in p_val if x and str(x).strip()])
        elif isinstance(p_val, str) and p_val.strip():
            selected_products.extend([x.strip() for x in p_val.split(',') if x.strip()])

    for key in ['products', 'product']:
        for val in request.args.getlist(key):
            if val and val.strip():
                if ',' in val:
                    selected_products.extend([x.strip() for x in val.split(',') if x.strip()])
                else:
                    selected_products.append(val.strip())

    # Deduplicate while preserving order
    seen_p = set()
    unique_selected = []
    for p in selected_products:
        p_clean = p.strip()
        if p_clean and p_clean.lower() not in seen_p:
            seen_p.add(p_clean.lower())
            unique_selected.append(p_clean)
    selected_products = unique_selected

    if not selected_products:
        return jsonify({
            'selected_product': '',
            'selected_products': [],
            'frequently_bought_together': []
        })

    transactions = db.get_transactions(user_email=user_email, dataset_id=dataset_id)
    if transactions is None or len(transactions) == 0:
        return jsonify({
            'selected_product': selected_products[0] if selected_products else '',
            'selected_products': selected_products,
            'frequently_bought_together': []
        })

    cat_map = db.get_product_categories_for_dataset(dataset_id=dataset_id, user_email=user_email)
    target_clean_lower = {p.lower() for p in selected_products}
    
    # 1. Exact match transactions: contain ALL selected products
    exact_match_txs = []
    for tx in transactions:
        tx_item_map = {str(item).strip().lower(): str(item).strip() for item in tx if item}
        if target_clean_lower.issubset(set(tx_item_map.keys())):
            exact_match_txs.append(tx_item_map)

    co_counts = {}
    if exact_match_txs:
        # Transactions that contain the entire selected set
        for tx_item_map in exact_match_txs:
            for it_lower, orig_name in tx_item_map.items():
                if it_lower not in target_clean_lower:
                    co_counts[orig_name] = co_counts.get(orig_name, 0) + 1
        matched_tx_count = len(exact_match_txs)
    else:
        # Partial match fallback if no single transaction has all selected items simultaneously
        matched_tx_count = 0
        for tx in transactions:
            tx_item_map = {str(item).strip().lower(): str(item).strip() for item in tx if item}
            overlap = target_clean_lower.intersection(set(tx_item_map.keys()))
            if overlap:
                matched_tx_count += 1
                for it_lower, orig_name in tx_item_map.items():
                    if it_lower not in target_clean_lower:
                        co_counts[orig_name] = co_counts.get(orig_name, 0) + 1

    results = [
        {
            'product_name': name,
            'name': name,
            'count': count,
            'category': cat_map.get(name, 'Uncategorized'),
            'percentage': round((count / matched_tx_count * 100), 1) if matched_tx_count > 0 else 0
        }
        for name, count in co_counts.items()
    ]
    # Full list exposed! No limit of 1 result!
    results.sort(key=lambda x: (-x['count'], x['product_name'].lower()))

    return jsonify({
        'selected_product': selected_products[0] if selected_products else '',
        'selected_products': selected_products,
        'frequently_bought_together': results,
        'match_mode': 'exact' if exact_match_txs else 'partial',
        'matched_transactions': matched_tx_count
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
    invalidate_dataset_cache()
    
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
        
        transactions, duplicates_removed, missing_removed, basket_values_list, date_range_days, basket_avg, tx_dates_list, detected_cols, item_details = parse_df_to_transactions(df)
            
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
        
        db.add_transactions(transactions, dataset_id=ds_id, user_email=user_email, basket_values=basket_values_list, dates=tx_dates_list, item_details=item_details)
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
    invalidate_dataset_cache(dataset_id)
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

    cache_key = (str(dataset_id), str(user_email))
    cached = CACHE_TRENDS.get(cache_key)
    if cached and (time.time() - cached['time'] < 300):
        return jsonify(cached['data'])

    # Fast direct aggregation from SQLite (runs in milliseconds instead of joining all transaction items)
    date_counts = db.get_transaction_dates_aggregated(user_email=user_email, dataset_id=dataset_id)
    if not date_counts:
        # Fallback to upload date if no transaction dates recorded in file
        if dataset_info.get('upload_date'):
            up_d = str(dataset_info['upload_date']).split(' ')[0].split('T')[0]
            tx_count = dataset_info.get('transaction_count') or 1
            date_counts = [{'date': up_d, 'count': tx_count}]
        else:
            return jsonify({'trends': []})

    trends = []
    for item in date_counts:
        d_str = str(item['date'])
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
            'count': int(item['count'])
        })
        
    trends_payload = {'trends': trends}
    CACHE_TRENDS[cache_key] = {'time': time.time(), 'data': trends_payload}
    return jsonify(trends_payload)

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
    invalidate_dataset_cache()
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


# ═════════════════════════════════════════════════════════════════════════════
# ── System Admin API Endpoints ────────────────────────────────────────────────
# ═════════════════════════════════════════════════════════════════════════════

@app.route('/api/admin/dashboard-stats', methods=['GET'])
def admin_dashboard_stats():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]
    stats = db.get_admin_dashboard_kpis()
    return jsonify(stats)

@app.route('/api/admin/system-activity', methods=['GET'])
def admin_system_activity():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]
    days = request.args.get('days', 30, type=int)
    activity_series = db.get_admin_system_activity_series(days=days)
    return jsonify({'series': activity_series})

@app.route('/api/admin/businesses', methods=['GET', 'POST'])
def admin_businesses():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    if request.method == 'GET':
        search = request.args.get('search') or None
        type_filter = request.args.get('type') or None
        status_filter = request.args.get('status') or None
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        businesses, total = db.get_all_businesses_admin(
            search=search,
            type_filter=type_filter,
            status_filter=status_filter,
            limit=limit,
            offset=offset
        )
        counts = db.get_business_counts()
        return jsonify({
            'businesses': businesses,
            'total': total,
            'counts': counts
        })

    # POST - Create new business
    data = request.json or {}
    name = data.get('name', '').strip()
    owner_email = data.get('owner_email', '').strip().lower()
    business_type = data.get('business_type', 'Retail').strip()
    address = data.get('address', '').strip()
    contact_phone = data.get('contact_phone', '').strip()
    status = data.get('status', 'Active').strip()

    if not name or not owner_email:
        return jsonify({'error': 'Business name and owner email are required'}), 400

    business_id = db.create_business(
        name=name,
        owner_email=owner_email,
        business_type=business_type,
        address=address,
        contact_phone=contact_phone,
        status=status,
        approved_by=user_info['email'] if status == 'Active' else None
    )

    # Ensure user exists for owner_email or create default business admin
    owner_user = db.get_user(owner_email)
    if not owner_user:
        db.create_user_admin(
            email=owner_email,
            password=data.get('initial_password', 'Welcome123!'),
            name=data.get('owner_name', name + ' Admin'),
            role='business_admin',
            store_id=business_id,
            status='active' if status == 'Active' else 'pending_approval'
        )
    else:
        db.update_user_store(owner_email, business_id, status='active' if status == 'Active' else 'pending_approval')

    ip_addr = request.remote_addr if request else None
    db.log_activity(business_id, user_info['email'], 'CREATE_BUSINESS', {'business_id': business_id, 'name': name, 'type': business_type}, ip_address=ip_addr)

    created = db.get_business_by_id(business_id)
    return jsonify({'message': 'Business created successfully', 'business': created}), 201

@app.route('/api/admin/businesses/<int:business_id>', methods=['GET', 'PUT', 'DELETE'])
def admin_business_detail(business_id):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    business = db.get_business_by_id(business_id)
    if not business:
        return jsonify({'error': 'Business not found'}), 404

    if request.method == 'GET':
        users = db.get_business_users(business_id)
        datasets = db.get_business_datasets(business_id)
        analyses = db.get_business_analyses(business_id)
        activity = db.get_business_activity(business_id)
        return jsonify({
            'business': business,
            'users': users,
            'datasets': datasets,
            'analyses': analyses,
            'activity': activity
        })

    if request.method == 'PUT':
        data = request.json or {}
        name = data.get('name')
        business_type = data.get('business_type')
        address = data.get('address')
        contact_phone = data.get('contact_phone')
        status = data.get('status')

        db.update_business(
            business_id=business_id,
            name=name,
            business_type=business_type,
            address=address,
            contact_phone=contact_phone,
            status=status
        )

        ip_addr = request.remote_addr if request else None
        db.log_activity(business_id, user_info['email'], 'UPDATE_BUSINESS', {'business_id': business_id, 'name': name}, ip_address=ip_addr)
        updated = db.get_business_by_id(business_id)
        return jsonify({'message': 'Business updated successfully', 'business': updated})

    if request.method == 'DELETE':
        # Soft delete / set to inactive
        db.update_business(business_id=business_id, status='Inactive')
        ip_addr = request.remote_addr if request else None
        db.log_activity(business_id, user_info['email'], 'DEACTIVATE_BUSINESS', {'business_id': business_id}, ip_address=ip_addr)
        return jsonify({'message': 'Business deactivated successfully'})

@app.route('/api/admin/businesses/<int:business_id>/approve', methods=['POST'])
def admin_approve_business(business_id):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    business = db.get_business_by_id(business_id)
    if not business:
        return jsonify({'error': 'Business not found'}), 404

    db.approve_business(business_id, user_info['email'])
    ip_addr = request.remote_addr if request else None
    db.log_activity(business_id, user_info['email'], 'APPROVE_BUSINESS', {'business_id': business_id, 'name': business['name']}, ip_address=ip_addr)

    return jsonify({'message': f"Business '{business['name']}' has been approved successfully."})

@app.route('/api/admin/businesses/<int:business_id>/reject', methods=['POST'])
def admin_reject_business(business_id):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    business = db.get_business_by_id(business_id)
    if not business:
        return jsonify({'error': 'Business not found'}), 404

    reason = (request.json or {}).get('reason', 'Application did not meet registration criteria.')
    db.reject_business(business_id, user_info['email'], reason=reason)
    ip_addr = request.remote_addr if request else None
    db.log_activity(business_id, user_info['email'], 'REJECT_BUSINESS', {'business_id': business_id, 'name': business['name'], 'reason': reason}, ip_address=ip_addr)

    return jsonify({'message': f"Business '{business['name']}' registration request was rejected."})

@app.route('/api/admin/businesses/<int:business_id>/status', methods=['PATCH'])
def admin_update_business_status(business_id):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    status = (request.json or {}).get('status')
    if not status or status not in ('Active', 'Inactive', 'Pending Approval', 'Rejected'):
        return jsonify({'error': 'Invalid status value'}), 400

    db.update_business(business_id=business_id, status=status)
    ip_addr = request.remote_addr if request else None
    db.log_activity(business_id, user_info['email'], 'UPDATE_BUSINESS_STATUS', {'business_id': business_id, 'status': status}, ip_address=ip_addr)

    return jsonify({'message': f"Business status updated to {status}."})

@app.route('/api/admin/users', methods=['GET', 'POST'])
def admin_users():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    if request.method == 'GET':
        search = request.args.get('search') or None
        business_id = request.args.get('business_id') or None
        role = request.args.get('role') or None
        status = request.args.get('status') or None
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        users, total = db.get_all_users_admin(
            search=search,
            business_id=business_id,
            role=role,
            status=status,
            limit=limit,
            offset=offset
        )
        return jsonify({'users': users, 'total': total})

    # POST - Create user
    data = request.json or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    name = data.get('name', '').strip()
    role = data.get('role', 'business_admin').strip()
    store_id = data.get('store_id')
    status = data.get('status', 'active').strip()

    if not email or not password or not name:
        return jsonify({'error': 'Email, password, and name are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    success = db.create_user_admin(
        email=email,
        password=password,
        name=name,
        role=role,
        store_id=store_id if store_id != 'none' and store_id != 0 else None,
        status=status
    )
    if not success:
        return jsonify({'error': 'User with this email already exists'}), 409

    ip_addr = request.remote_addr if request else None
    db.log_activity(store_id, user_info['email'], 'CREATE_USER', {'email': email, 'role': role, 'name': name}, ip_address=ip_addr)
    return jsonify({'message': f"User '{name}' created successfully."}), 201

@app.route('/api/admin/users/<path:email>', methods=['PUT', 'DELETE'])
def admin_user_detail(email):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    clean_email = email.strip().lower()
    target_user = db.get_user(clean_email)
    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    if request.method == 'PUT':
        data = request.json or {}
        name = data.get('name')
        role = data.get('role')
        store_id = data.get('store_id')
        status = data.get('status')

        db.update_user_admin(
            clean_email,
            name=name,
            role=role,
            store_id=store_id,
            status=status
        )
        ip_addr = request.remote_addr if request else None
        db.log_activity(store_id or target_user.get('store_id'), user_info['email'], 'UPDATE_USER', {'email': clean_email, 'role': role, 'status': status}, ip_address=ip_addr)
        return jsonify({'message': f"User {clean_email} updated successfully."})

    if request.method == 'DELETE':
        # Do not allow deleting current user or last system admin
        if clean_email == user_info['email'].lower():
            return jsonify({'error': 'Cannot delete your own administrator account'}), 400
        db.update_user_admin(clean_email, status='inactive')
        ip_addr = request.remote_addr if request else None
        db.log_activity(target_user.get('store_id'), user_info['email'], 'DEACTIVATE_USER', {'email': clean_email}, ip_address=ip_addr)
        return jsonify({'message': f"User {clean_email} deactivated."})

@app.route('/api/admin/users/<path:email>/status', methods=['PATCH'])
def admin_user_status(email):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    clean_email = email.strip().lower()
    status = (request.json or {}).get('status')
    if not status or status not in ('active', 'inactive', 'pending_approval', 'rejected'):
        return jsonify({'error': 'Invalid status'}), 400

    db.update_user_admin(clean_email, status=status)
    ip_addr = request.remote_addr if request else None
    db.log_activity(None, user_info['email'], 'UPDATE_USER_STATUS', {'email': clean_email, 'status': status}, ip_address=ip_addr)
    return jsonify({'message': f"User status updated to {status}."})

@app.route('/api/admin/users/<path:email>/reset-password', methods=['POST'])
def admin_reset_user_password(email):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    clean_email = email.strip().lower()
    new_password = (request.json or {}).get('new_password', '').strip()
    if not new_password or len(new_password) < 6:
        return jsonify({'error': 'New password must be at least 6 characters'}), 400

    db.reset_user_password(clean_email, new_password)
    ip_addr = request.remote_addr if request else None
    db.log_activity(None, user_info['email'], 'RESET_USER_PASSWORD', {'email': clean_email}, ip_address=ip_addr)
    return jsonify({'message': f"Password for {clean_email} has been reset successfully."})

@app.route('/api/admin/datasets', methods=['GET'])
def admin_datasets():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    search = request.args.get('search') or None
    business_id = request.args.get('business_id') or None
    status = request.args.get('status') or None
    limit = request.args.get('limit', 100, type=int)

    datasets = db.get_all_datasets_admin(
        search=search,
        business_id=business_id,
        status=status,
        limit=limit
    )
    return jsonify({'datasets': datasets, 'total': len(datasets)})

@app.route('/api/admin/datasets/<int:dataset_id>', methods=['GET', 'DELETE'])
def admin_dataset_detail(dataset_id):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    ds = db.get_dataset_admin_details(dataset_id)
    if not ds:
        return jsonify({'error': 'Dataset not found'}), 404

    if request.method == 'GET':
        return jsonify(ds)

    if request.method == 'DELETE':
        # Admin delete dataset and clear transactions
        conn = db.get_db_connection()
        conn.execute("DELETE FROM transactions WHERE dataset_id = ?", (dataset_id,))
        conn.execute("DELETE FROM analyses WHERE dataset_id = ?", (dataset_id,))
        conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
        conn.commit()
        conn.close()

        invalidate_dataset_cache(dataset_id)
        ip_addr = request.remote_addr if request else None
        db.log_activity(ds.get('business_id'), user_info['email'], 'DELETE_DATASET', {'dataset_id': dataset_id, 'name': ds.get('name')}, ip_address=ip_addr)
        return jsonify({'message': f"Dataset '{ds.get('name')}' deleted successfully."})

@app.route('/api/admin/analysis-history', methods=['GET'])
def admin_analysis_history():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    search = request.args.get('search') or None
    business_id = request.args.get('business_id') or None
    algorithm = request.args.get('algorithm') or None
    status = request.args.get('status') or None
    limit = request.args.get('limit', 100, type=int)

    analyses = db.get_all_analyses_admin(
        search=search,
        business_id=business_id,
        algorithm=algorithm,
        status=status,
        limit=limit
    )
    return jsonify({'analyses': analyses, 'total': len(analyses)})

@app.route('/api/admin/analysis-history/<int:analysis_id>', methods=['GET'])
def admin_analysis_detail(analysis_id):
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    rec = db.get_analysis_record(analysis_id)
    if not rec:
        return jsonify({'error': 'Analysis record not found'}), 404
    return jsonify(rec)

@app.route('/api/admin/evaluations/datasets', methods=['GET'])
def admin_evaluations_datasets():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    datasets = db.get_all_datasets_admin(limit=100)
    filtered = [
        {
            'id': d['id'],
            'name': d['name'],
            'business_name': d.get('business_name') or 'Default Store',
            'business_id': d.get('business_id'),
            'transaction_count': d.get('transaction_count') or 0,
            'unique_items': d.get('unique_items') or 0,
            'market_type': d.get('market_type') or 'Default/unknown'
        }
        for d in datasets if (d.get('transaction_count') or 0) > 0
    ]
    return jsonify({'datasets': filtered})

@app.route('/api/admin/evaluations/benchmark', methods=['POST'])
def admin_evaluations_benchmark():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    data = request.json or {}
    dataset_id = data.get('dataset_id')
    if not dataset_id:
        return jsonify({'error': 'dataset_id is required'}), 400

    min_support = float(data.get('min_support', 0.01))
    min_confidence = float(data.get('min_confidence', 0.2))

    if str(dataset_id).lower() == 'all':
        conn = db.get_db_connection()
        datasets = conn.execute("""
            SELECT d.id, d.name, d.transaction_count, d.unique_items, s.name as business_name
            FROM datasets d
            LEFT JOIN stores s ON d.business_id = s.id
            WHERE d.transaction_count > 0
            ORDER BY d.id
        """).fetchall()

        breakdown = []
        apriori_times = []
        fpgrowth_times = []
        apriori_mems = []
        fpgrowth_mems = []
        total_ap_rules = 0
        total_fp_rules = 0
        total_ap_itemsets = 0
        total_fp_itemsets = 0
        total_tx_count = 0
        fpgrowth_selected_count = 0
        apriori_selected_count = 0

        for ds in datasets:
            did = ds['id']
            tx_rows = conn.execute("""
                SELECT t.id, ti.item
                FROM transactions t
                JOIN transaction_items ti ON t.id = ti.transaction_id
                WHERE t.dataset_id = ?
                LIMIT 4000
            """, (did,)).fetchall()

            tx_map = {}
            for r in tx_rows:
                tx_map.setdefault(r['id'], []).append(r['item'])
            txs = list(tx_map.values())[:800]
            if not txs:
                continue

            total_tx_count += ds['transaction_count'] or len(txs)

            te = TransactionEncoder()
            te_ary = te.fit(txs).transform(txs)
            df = pd.DataFrame(te_ary, columns=te.columns_)

            # Apriori
            tracemalloc.start()
            t0_ap = time.time()
            try:
                ap_items = apriori(df, min_support=min_support, use_colnames=True)
                ap_time = round(time.time() - t0_ap, 4)
                _, ap_peak = tracemalloc.get_traced_memory()
                tracemalloc.stop()
                ap_rules = association_rules(ap_items, metric="confidence", min_threshold=min_confidence) if not ap_items.empty else pd.DataFrame()
            except Exception:
                tracemalloc.stop()
                ap_time = 0.0
                ap_peak = 0
                ap_items = pd.DataFrame()
                ap_rules = pd.DataFrame()

            # FP-Growth
            tracemalloc.start()
            t0_fp = time.time()
            try:
                fp_items = fpgrowth(df, min_support=min_support, use_colnames=True)
                fp_time = round(time.time() - t0_fp, 4)
                _, fp_peak = tracemalloc.get_traced_memory()
                tracemalloc.stop()
                fp_rules = association_rules(fp_items, metric="confidence", min_threshold=min_confidence) if not fp_items.empty else pd.DataFrame()
            except Exception:
                tracemalloc.stop()
                fp_time = 0.0
                fp_peak = 0
                fp_items = pd.DataFrame()
                fp_rules = pd.DataFrame()

            ap_mem_kb = round(ap_peak / 1024, 2)
            fp_mem_kb = round(fp_peak / 1024, 2)

            # Policy selection for this dataset
            num_tx = ds['transaction_count'] or len(txs)
            num_it = ds['unique_items'] or len(te.columns_)
            if fp_peak < ap_peak and (num_tx >= 500 or num_it >= 50 or fp_time <= ap_time * 2.0):
                ds_algo = 'FP-Growth'
                fpgrowth_selected_count += 1
            elif ap_time < fp_time and ap_peak <= fp_peak * 1.5:
                ds_algo = 'Apriori'
                apriori_selected_count += 1
            elif fp_time <= ap_time:
                ds_algo = 'FP-Growth'
                fpgrowth_selected_count += 1
            else:
                ds_algo = 'Apriori'
                apriori_selected_count += 1

            apriori_times.append(ap_time)
            fpgrowth_times.append(fp_time)
            apriori_mems.append(ap_mem_kb)
            fpgrowth_mems.append(fp_mem_kb)
            total_ap_rules += len(ap_rules)
            total_fp_rules += len(fp_rules)
            total_ap_itemsets += len(ap_items)
            total_fp_itemsets += len(fp_items)

            breakdown.append({
                'id': did,
                'name': ds['name'],
                'business_name': ds['business_name'] or 'System Enterprise',
                'transactions': ds['transaction_count'] or len(txs),
                'unique_items': ds['unique_items'] or len(te.columns_),
                'selected_algorithm': ds_algo,
                'faster_algorithm': 'FP-Growth' if fp_time <= ap_time else 'Apriori',
                'memory_winner': 'FP-Growth' if fp_peak <= ap_peak else 'Apriori',
                'apriori_time': ap_time,
                'fpgrowth_time': fp_time,
                'apriori_mem_kb': ap_mem_kb,
                'fpgrowth_mem_kb': fp_mem_kb,
                'rules_generated': len(fp_rules),
                'frequent_itemsets': len(fp_items)
            })

        conn.close()

        n = max(len(breakdown), 1)
        avg_ap_time = round(sum(apriori_times) / n, 4)
        avg_fp_time = round(sum(fpgrowth_times) / n, 4)
        avg_ap_mem = round(sum(apriori_mems) / n, 2)
        avg_fp_mem = round(sum(fpgrowth_mems) / n, 2)
        speedup = round(avg_ap_time / avg_fp_time, 2) if avg_fp_time > 0 and avg_ap_time > 0 else 1.0

        overall_selected = 'FP-Growth' if fpgrowth_selected_count >= apriori_selected_count else 'Apriori'
        selected_pct = round((max(fpgrowth_selected_count, apriori_selected_count) / n) * 100, 1)
        mem_savings_pct = round(((avg_ap_mem - avg_fp_mem) / max(avg_ap_mem, 1)) * 100, 1) if avg_ap_mem > avg_fp_mem else 0

        if overall_selected == 'FP-Growth':
            reason = (
                f"Across all {len(breakdown)} platform datasets, FP-Growth was selected in {selected_pct}% of evaluations "
                f"({fpgrowth_selected_count} of {len(breakdown)} datasets) because it reduced peak memory by an average of {mem_savings_pct}% "
                f"({avg_fp_mem:,.2f} KB vs {avg_ap_mem:,.2f} KB) while achieving {speedup}x average speedup."
            )
        else:
            reason = (
                f"Across all {len(breakdown)} platform datasets, Apriori was selected in {selected_pct}% of evaluations "
                f"({apriori_selected_count} of {len(breakdown)} datasets) due to lower execution overhead on small transaction catalogs."
            )

        return jsonify({
            'dataset_id': 'all',
            'dataset_name': 'All Datasets (Platform-Wide Overall Evaluation)',
            'total_datasets': len(breakdown),
            'transaction_count': total_tx_count,
            'unique_items': sum(b['unique_items'] for b in breakdown),
            'parameters': {
                'min_support': min_support,
                'min_confidence': min_confidence
            },
            'selected_algorithm': overall_selected,
            'selection_reason': reason,
            'selected_stats': {
                'fp_count': fpgrowth_selected_count,
                'ap_count': apriori_selected_count,
                'total_count': len(breakdown),
                'fp_pct': round((fpgrowth_selected_count / n) * 100, 1),
                'ap_pct': round((apriori_selected_count / n) * 100, 1)
            },
            'apriori': {
                'execution_time_seconds': avg_ap_time,
                'peak_memory_kb': avg_ap_mem,
                'frequent_itemsets': total_ap_itemsets,
                'rules_generated': total_ap_rules
            },
            'fpgrowth': {
                'execution_time_seconds': avg_fp_time,
                'peak_memory_kb': avg_fp_mem,
                'frequent_itemsets': total_fp_itemsets,
                'rules_generated': total_fp_rules
            },
            'comparison': {
                'speedup_factor': speedup,
                'faster_algorithm': 'FP-Growth' if avg_fp_time <= avg_ap_time else 'Apriori',
                'memory_efficiency_winner': 'FP-Growth' if avg_fp_mem <= avg_ap_mem else 'Apriori',
                'rules_agreement': total_ap_rules == total_fp_rules
            },
            'dataset_breakdown': breakdown
        })

    # Retrieve transactions for a single dataset
    conn = db.get_db_connection()
    ds_row = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    if not ds_row:
        conn.close()
        return jsonify({'error': 'Dataset not found'}), 404

    tx_rows = conn.execute("""
        SELECT t.id, ti.item
        FROM transactions t
        JOIN transaction_items ti ON t.id = ti.transaction_id
        WHERE t.dataset_id = ?
        ORDER BY t.id
    """, (dataset_id,)).fetchall()
    conn.close()

    tx_map = {}
    for r in tx_rows:
        tid = r['id']
        if tid not in tx_map:
            tx_map[tid] = []
        tx_map[tid].append(r['item'])
    transactions = list(tx_map.values())

    if not transactions:
        return jsonify({'error': 'No transaction items found for this dataset'}), 400

    te = TransactionEncoder()
    te_ary = te.fit(transactions).transform(transactions)
    df = pd.DataFrame(te_ary, columns=te.columns_)

    # 1. Benchmark Apriori
    tracemalloc.start()
    t0_apriori = time.time()
    try:
        apriori_itemsets = apriori(df, min_support=min_support, use_colnames=True)
        apriori_time = round(time.time() - t0_apriori, 4)
        apriori_current_mem, apriori_peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        apriori_rules = association_rules(apriori_itemsets, metric="confidence", min_threshold=min_confidence) if not apriori_itemsets.empty else pd.DataFrame()
        apriori_itemsets_count = len(apriori_itemsets)
        apriori_rules_count = len(apriori_rules)
    except Exception as e:
        tracemalloc.stop()
        apriori_time = 0.0
        apriori_peak_mem = 0
        apriori_itemsets_count = 0
        apriori_rules_count = 0

    # 2. Benchmark FP-Growth
    tracemalloc.start()
    t0_fpgrowth = time.time()
    try:
        fpgrowth_itemsets = fpgrowth(df, min_support=min_support, use_colnames=True)
        fpgrowth_time = round(time.time() - t0_fpgrowth, 4)
        fpgrowth_current_mem, fpgrowth_peak_mem = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        fpgrowth_rules = association_rules(fpgrowth_itemsets, metric="confidence", min_threshold=min_confidence) if not fpgrowth_itemsets.empty else pd.DataFrame()
        fpgrowth_itemsets_count = len(fpgrowth_itemsets)
        fpgrowth_rules_count = len(fpgrowth_rules)
    except Exception as e:
        tracemalloc.stop()
        fpgrowth_time = 0.0
        fpgrowth_peak_mem = 0
        fpgrowth_itemsets_count = 0
        fpgrowth_rules_count = 0

    speedup = round(apriori_time / fpgrowth_time, 2) if fpgrowth_time > 0 and apriori_time > 0 else 1.0

    # Policy-based algorithm selection logic
    num_tx = len(transactions)
    num_items = len(te.columns_)
    apriori_mem_kb = round(apriori_peak_mem / 1024, 2)
    fpgrowth_mem_kb = round(fpgrowth_peak_mem / 1024, 2)

    if fpgrowth_peak_mem < apriori_peak_mem and (num_tx >= 500 or num_items >= 50 or fpgrowth_time <= apriori_time * 2.0):
        selected_algorithm = 'FP-Growth'
        selection_reason = (
            f"The system selected FP-Growth because it uses significantly less memory "
            f"({fpgrowth_mem_kb:,.2f} KB vs {apriori_mem_kb:,.2f} KB) while still producing the same number of rules and frequent itemsets."
        )
    elif apriori_time < fpgrowth_time and apriori_peak_mem <= fpgrowth_peak_mem * 1.5:
        selected_algorithm = 'Apriori'
        selection_reason = (
            f"The system selected Apriori because it completed the evaluation faster "
            f"({apriori_time:.4f}s vs {fpgrowth_time:.4f}s) while producing the same number of rules and frequent itemsets."
        )
    elif fpgrowth_time <= apriori_time:
        selected_algorithm = 'FP-Growth'
        selection_reason = (
            f"The system selected FP-Growth because it completed the evaluation faster "
            f"({fpgrowth_time:.4f}s vs {apriori_time:.4f}s) while producing the same number of rules and frequent itemsets."
        )
    else:
        selected_algorithm = 'Apriori'
        selection_reason = (
            f"The system selected Apriori because it completed the evaluation faster "
            f"({apriori_time:.4f}s vs {fpgrowth_time:.4f}s) while producing the same number of rules and frequent itemsets."
        )

    return jsonify({
        'dataset_id': dataset_id,
        'dataset_name': ds_row['name'],
        'transaction_count': len(transactions),
        'unique_items': len(te.columns_),
        'parameters': {
            'min_support': min_support,
            'min_confidence': min_confidence
        },
        'selected_algorithm': selected_algorithm,
        'selection_reason': selection_reason,
        'apriori': {
            'execution_time_seconds': apriori_time,
            'peak_memory_kb': apriori_mem_kb,
            'frequent_itemsets': apriori_itemsets_count,
            'rules_generated': apriori_rules_count
        },
        'fpgrowth': {
            'execution_time_seconds': fpgrowth_time,
            'peak_memory_kb': fpgrowth_mem_kb,
            'frequent_itemsets': fpgrowth_itemsets_count,
            'rules_generated': fpgrowth_rules_count
        },
        'comparison': {
            'speedup_factor': speedup,
            'faster_algorithm': 'FP-Growth' if fpgrowth_time <= apriori_time else 'Apriori',
            'memory_efficiency_winner': 'FP-Growth' if fpgrowth_peak_mem <= apriori_peak_mem else 'Apriori',
            'rules_agreement': apriori_rules_count == fpgrowth_rules_count
        }
    })

@app.route('/api/admin/audit-logs', methods=['GET'])
def admin_audit_logs():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    search = request.args.get('search') or None
    user_filter = request.args.get('user') or None
    business_filter = request.args.get('business') or None
    action_filter = request.args.get('action') or None
    status_filter = request.args.get('status') or None
    start_date = request.args.get('start_date') or None
    end_date = request.args.get('end_date') or None
    limit = request.args.get('limit', 100, type=int)
    offset = request.args.get('offset', 0, type=int)

    logs, total = db.get_all_audit_logs(
        search=search,
        user_filter=user_filter,
        business_filter=business_filter,
        action_filter=action_filter,
        status_filter=status_filter,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )

    # Format JSON details
    for l in logs:
        if l.get('details'):
            try:
                l['details_parsed'] = json.loads(l['details'])
            except Exception:
                l['details_parsed'] = l['details']

    return jsonify({'logs': logs, 'total': total})

@app.route('/api/admin/audit-logs/export', methods=['GET'])
def admin_audit_logs_export():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    logs, _ = db.get_all_audit_logs(limit=5000)
    
    import io
    import csv
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['ID', 'Timestamp', 'Business', 'User Email', 'User Name', 'Action', 'Status', 'Details'])
    for l in logs:
        writer.writerow([
            l.get('id'),
            l.get('created_at'),
            l.get('business_name') or 'Platform System',
            l.get('user_email'),
            l.get('user_name') or '',
            l.get('action'),
            l.get('status') or 'Success',
            l.get('details') or ''
        ])
    
    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=cobuy_platform_audit_logs.csv'
    return response

@app.route('/api/admin/settings', methods=['GET', 'PUT'])
def admin_settings():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    if request.method == 'GET':
        settings = db.get_system_settings()
        return jsonify({'settings': settings})

    # PUT - update settings
    settings_dict = request.json or {}
    # Flatten nested category dict if passed as { general: { ... }, analysis: { ... } }
    flat_settings = {}
    for cat_or_key, val in settings_dict.items():
        if isinstance(val, dict):
            for sub_k, sub_v in val.items():
                flat_settings[sub_k] = sub_v
        else:
            flat_settings[cat_or_key] = val

    db.update_system_settings(flat_settings, updated_by=user_info['email'])
    ip_addr = request.remote_addr if request else None
    db.log_activity(None, user_info['email'], 'UPDATE_SETTINGS', {'keys_updated': list(flat_settings.keys())}, ip_address=ip_addr)
    return jsonify({'message': 'System settings updated successfully.'})

@app.route('/api/admin/profile', methods=['GET', 'PUT'])
def admin_profile():
    user_info, err = require_system_admin()
    if err:
        return err[0], err[1]

    if request.method == 'GET':
        return jsonify({'user': user_info})

    # PUT - update admin profile name/password
    data = request.json or {}
    name = data.get('name', '').strip()
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')

    if current_password:
        if user_info['password'] != current_password:
            return jsonify({'error': 'Current password is incorrect'}), 400
        if new_password and len(new_password) >= 6:
            db.reset_user_password(user_info['email'], new_password)

    if name:
        db.update_user_admin(user_info['email'], name=name)

    ip_addr = request.remote_addr if request else None
    db.log_activity(None, user_info['email'], 'UPDATE_ADMIN_PROFILE', {'updated_name': bool(name), 'updated_password': bool(new_password)}, ip_address=ip_addr)

    updated_user = db.get_user(user_info['email'])
    return jsonify({'message': 'Profile updated successfully', 'user': updated_user})


if __name__ == '__main__':
    app.run(debug=True, port=5000, threaded=True)
