import sqlite3
import os
import datetime
import json

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # stores
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            owner_email TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # users (base)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'shop_admin'
        )
    ''')

    # users migrations
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [col[1] for col in cursor.fetchall()]

    for col_name, col_def in [
        ('account_type',     "ALTER TABLE users ADD COLUMN account_type TEXT DEFAULT 'admin'"),
        ('store_id',         "ALTER TABLE users ADD COLUMN store_id INTEGER REFERENCES stores(id)"),
        ('status',           "ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'"),
        ('failed_attempts', "ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0"),
        ('lockout_level',    "ALTER TABLE users ADD COLUMN lockout_level INTEGER DEFAULT 0"),
        ('locked_until',     "ALTER TABLE users ADD COLUMN locked_until TEXT"),
        ('last_failed_login', "ALTER TABLE users ADD COLUMN last_failed_login TEXT"),
        ('account_status',   "ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'ACTIVE'"),
    ]:
        if col_name not in user_columns:
            try:
                cursor.execute(col_def)
            except sqlite3.OperationalError:
                pass

    # Back-fill role from account_type for existing rows
    try:
        cursor.execute("""
            UPDATE users
            SET role = CASE
                WHEN account_type = 'admin' THEN 'shop_admin'
                WHEN account_type = 'member' THEN 'team_member'
                ELSE 'shop_admin'
            END
            WHERE role NOT IN ('shop_admin', 'team_member')
        """)
    except sqlite3.OperationalError:
        pass

    # invitations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS invitations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            token TEXT UNIQUE NOT NULL,
            store_id INTEGER NOT NULL REFERENCES stores(id),
            expires_at TIMESTAMP NOT NULL,
            is_accepted INTEGER DEFAULT 0,
            max_uses INTEGER DEFAULT 1,
            uses_count INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1
        )
    ''')

    cursor.execute("PRAGMA table_info(invitations)")
    inv_columns = [col[1] for col in cursor.fetchall()]
    for col_name, col_def in [
        ("max_uses",      "ALTER TABLE invitations ADD COLUMN max_uses INTEGER DEFAULT 1"),
        ("uses_count",    "ALTER TABLE invitations ADD COLUMN uses_count INTEGER DEFAULT 0"),
        ("is_active",     "ALTER TABLE invitations ADD COLUMN is_active INTEGER DEFAULT 1"),
        ("invited_email", "ALTER TABLE invitations ADD COLUMN invited_email TEXT"),
        ("invited_by",    "ALTER TABLE invitations ADD COLUMN invited_by TEXT"),
        ("status",        "ALTER TABLE invitations ADD COLUMN status TEXT DEFAULT 'pending'"),
        ("role",          "ALTER TABLE invitations ADD COLUMN role TEXT DEFAULT 'team_member'"),
    ]:
        if col_name not in inv_columns:
            try:
                cursor.execute(col_def)
            except sqlite3.OperationalError:
                pass

    try:
        cursor.execute("UPDATE invitations SET invited_email = email WHERE invited_email IS NULL AND email IS NOT NULL")
        cursor.execute("UPDATE invitations SET status = 'accepted' WHERE is_accepted = 1 AND (status IS NULL OR status = 'pending')")
    except sqlite3.OperationalError:
        pass

    # notifications
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
            type TEXT NOT NULL,
            reference_id INTEGER,
            read INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # activity_logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            store_id INTEGER REFERENCES stores(id),
            user_email TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_deleted INTEGER DEFAULT 0
        )
    ''')

    # datasets
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS datasets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            user_email TEXT NULL REFERENCES users(email) ON DELETE CASCADE,
            file_hash TEXT NULL,
            market_type TEXT DEFAULT 'Default/unknown',
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            transaction_count INTEGER,
            unique_items INTEGER
        )
    ''')
    cursor.execute("PRAGMA table_info(datasets)")
    ds_columns = [col[1] for col in cursor.fetchall()]
    for col_name, col_def in [
        ('user_email',      "ALTER TABLE datasets ADD COLUMN user_email TEXT REFERENCES users(email) ON DELETE CASCADE"),
        ('file_hash',       "ALTER TABLE datasets ADD COLUMN file_hash TEXT"),
        ('market_type',     "ALTER TABLE datasets ADD COLUMN market_type TEXT DEFAULT 'Default/unknown'"),
        ('basket_avg',      "ALTER TABLE datasets ADD COLUMN basket_avg REAL DEFAULT NULL"),
        ('date_range_days', "ALTER TABLE datasets ADD COLUMN date_range_days INTEGER DEFAULT NULL"),
        ('missing_count',   "ALTER TABLE datasets ADD COLUMN missing_count INTEGER DEFAULT 0"),
        ('duplicates_count', "ALTER TABLE datasets ADD COLUMN duplicates_count INTEGER DEFAULT 0"),
        ('columns_detected', "ALTER TABLE datasets ADD COLUMN columns_detected TEXT DEFAULT NULL"),
    ]:
        if col_name not in ds_columns:
            try:
                cursor.execute(col_def)
            except sqlite3.OperationalError:
                pass

    # products
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            category TEXT DEFAULT 'Uncategorized',
            price REAL DEFAULT 0.0,
            stock INTEGER DEFAULT 0
        )
    ''')

    # transactions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dataset_id INTEGER NULL,
            user_email TEXT NULL REFERENCES users(email) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        )
    ''')
    cursor.execute("PRAGMA table_info(transactions)")
    tx_columns = [col[1] for col in cursor.fetchall()]
    for col_name, col_def in [
        ('dataset_id',   "ALTER TABLE transactions ADD COLUMN dataset_id INTEGER REFERENCES datasets(id) ON DELETE CASCADE"),
        ('user_email',   "ALTER TABLE transactions ADD COLUMN user_email TEXT REFERENCES users(email) ON DELETE CASCADE"),
        ('basket_value', "ALTER TABLE transactions ADD COLUMN basket_value REAL DEFAULT NULL"),
    ]:
        if col_name not in tx_columns:
            try:
                cursor.execute(col_def)
            except sqlite3.OperationalError:
                pass

    # transaction_items
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transaction_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transaction_id INTEGER NOT NULL,
            item TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions (id) ON DELETE CASCADE
        )
    ''')

    # indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_datasets_user ON datasets(user_email)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_dataset ON transactions(user_email, dataset_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transaction_items_tx ON transaction_items(transaction_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_transaction_items_item ON transaction_items(item)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_activity_logs_store ON activity_logs(store_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)")

    # seed admin
    cursor.execute('SELECT * FROM users WHERE email = ?', ('admin@ruleminer.ai',))
    if not cursor.fetchone():
        cursor.execute(
            'INSERT INTO users (email, password, name, role, account_type, status) VALUES (?, ?, ?, ?, ?, ?)',
            ('admin@ruleminer.ai', 'password123', 'Admin User', 'shop_admin', 'admin', 'active')
        )

    conn.commit()
    conn.close()

# ── User helpers ──────────────────────────────────────────────────────────────

def get_user(email):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    conn.close()
    return dict(user) if user else None

def create_user(email, password, name, role, account_type='admin', store_id=None, status='active'):
    conn = get_db_connection()
    success = False
    try:
        conn.execute(
            'INSERT INTO users (email, password, name, role, account_type, store_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (email, password, name, role, account_type, store_id, status)
        )
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()
    return success

def update_user_store(email, store_id, status='active'):
    conn = get_db_connection()
    conn.execute('UPDATE users SET store_id = ?, status = ? WHERE email = ?', (store_id, status, email))
    conn.commit()
    conn.close()

def update_user_role(email, role):
    conn = get_db_connection()
    conn.execute('UPDATE users SET role = ? WHERE email = ?', (role, email))
    conn.commit()
    conn.close()

def get_user_lockout_info(email):
    user = get_user(email)
    if not user:
        return None
    
    failed_attempts = user.get('failed_attempts') or 0
    lockout_level = user.get('lockout_level') or 0
    locked_until_str = user.get('locked_until')
    account_status = user.get('account_status') or 'ACTIVE'
    
    is_locked = False
    remaining_seconds = 0
    
    if locked_until_str:
        try:
            locked_until_dt = datetime.datetime.fromisoformat(locked_until_str.replace('Z', '+00:00'))
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            if locked_until_dt > now_dt:
                is_locked = True
                remaining_seconds = int((locked_until_dt - now_dt).total_seconds())
        except Exception:
            pass

    return {
        'failed_attempts': failed_attempts,
        'lockout_level': lockout_level,
        'locked_until': locked_until_str,
        'account_status': 'LOCKED' if is_locked else 'ACTIVE',
        'is_locked': is_locked,
        'remaining_seconds': max(0, remaining_seconds)
    }

def record_failed_login(email):
    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
    if not user:
        conn.close()
        return None
    
    user_dict = dict(user)
    failed_attempts = (user_dict.get('failed_attempts') or 0) + 1
    lockout_level = user_dict.get('lockout_level') or 0
    locked_until_str = user_dict.get('locked_until')
    
    now_dt = datetime.datetime.now(datetime.timezone.utc)
    now_str = now_dt.isoformat()
    
    had_previous_lockout = False
    if locked_until_str:
        try:
            prev_locked_until = datetime.datetime.fromisoformat(locked_until_str.replace('Z', '+00:00'))
            if now_dt >= prev_locked_until:
                had_previous_lockout = True
        except Exception:
            pass

    if failed_attempts >= 3 or had_previous_lockout:
        lockout_level = max(1, lockout_level + 1)
        duration_minutes = min(1440, 10 * (2 ** (lockout_level - 1)))
        locked_until_dt = now_dt + datetime.timedelta(minutes=duration_minutes)
        locked_until_str = locked_until_dt.isoformat()
        failed_attempts = 3
        account_status = 'LOCKED'
        
        conn.execute('''
            UPDATE users 
            SET failed_attempts = ?, lockout_level = ?, locked_until = ?, last_failed_login = ?, account_status = ?
            WHERE email = ?
        ''', (failed_attempts, lockout_level, locked_until_str, now_str, account_status, email))
        conn.commit()
        conn.close()
        
        remaining_seconds = int(duration_minutes * 60)
        return {
            'is_locked': True,
            'failed_attempts': failed_attempts,
            'lockout_level': lockout_level,
            'lockout_duration_minutes': duration_minutes,
            'locked_until': locked_until_str,
            'remaining_seconds': remaining_seconds,
            'message': f'Too many failed attempts. Your account is locked for {duration_minutes} minutes.'
        }
    else:
        attempts_remaining = 3 - failed_attempts
        conn.execute('''
            UPDATE users
            SET failed_attempts = ?, last_failed_login = ?
            WHERE email = ?
        ''', (failed_attempts, now_str, email))
        conn.commit()
        conn.close()
        
        return {
            'is_locked': False,
            'failed_attempts': failed_attempts,
            'attempts_remaining': attempts_remaining,
            'message': f'Incorrect password. You have {attempts_remaining} more attempt{"s" if attempts_remaining > 1 else ""} before the account is temporarily locked.'
        }

def reset_user_lockout(email):
    conn = get_db_connection()
    conn.execute('''
        UPDATE users
        SET failed_attempts = 0, lockout_level = 0, locked_until = NULL, account_status = 'ACTIVE'
        WHERE email = ?
    ''', (email,))
    conn.commit()
    conn.close()

def unlock_user_account(email):
    reset_user_lockout(email)
    return True

# ── Store helpers ─────────────────────────────────────────────────────────────

def create_store(name, owner_email):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO stores (name, owner_email) VALUES (?, ?)', (name, owner_email))
    store_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return store_id

def get_store_by_owner(owner_email):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM stores WHERE owner_email = ? ORDER BY id DESC LIMIT 1', (owner_email,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_store_by_id(store_id):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM stores WHERE id = ?', (store_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_store_members(store_id):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT email, name, role, account_type, status FROM users WHERE store_id = ?",
        (store_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Invitation helpers ────────────────────────────────────────────────────────

def create_invitation(invited_email, token, store_id, expires_at, invited_by=None, role='team_member', max_uses=1):
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO invitations '
            '(email, invited_email, invited_by, token, store_id, expires_at, role, max_uses, uses_count, is_active, status)'
            ' VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)',
            (invited_email, invited_email, invited_by, token, store_id, expires_at, role, max_uses, 'pending')
        )
        conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False
    finally:
        conn.close()

def get_invitation_by_token(token):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM invitations WHERE token = ?', (token,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_invitation_by_id(invitation_id):
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM invitations WHERE id = ?', (invitation_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def accept_invitation(token, user_email):
    return consume_invitation(token, user_email)

def consume_invitation(token, user_email):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        row = cursor.execute('SELECT * FROM invitations WHERE token = ?', (token,)).fetchone()
        if not row:
            return None
        inv = dict(row)
        max_uses   = inv.get('max_uses', 1) or 1
        uses_count = inv.get('uses_count', 0) or 0
        is_active  = inv.get('is_active', 1)
        if not is_active or uses_count >= max_uses:
            return None
        store_id     = inv['store_id']
        new_uses     = uses_count + 1
        still_active = 1 if new_uses < max_uses else 0
        cursor.execute(
            "UPDATE invitations SET uses_count=?, is_active=?, is_accepted=1, status='accepted' WHERE token=?",
            (new_uses, still_active, token)
        )
        cursor.execute(
            "UPDATE users SET store_id=?, status='active', role='team_member', account_type='member' WHERE email=?",
            (store_id, user_email)
        )
        conn.commit()
        return store_id
    except Exception:
        conn.rollback()
        return None
    finally:
        conn.close()

def consume_invitation_by_id(invitation_id, user_email):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        row = cursor.execute('SELECT * FROM invitations WHERE id = ?', (invitation_id,)).fetchone()
        if not row:
            return None
        inv = dict(row)
        max_uses   = inv.get('max_uses', 1) or 1
        uses_count = inv.get('uses_count', 0) or 0
        is_active  = inv.get('is_active', 1)
        if not is_active or uses_count >= max_uses:
            return None
        store_id     = inv['store_id']
        new_uses     = uses_count + 1
        still_active = 1 if new_uses < max_uses else 0
        cursor.execute(
            "UPDATE invitations SET uses_count=?, is_active=?, is_accepted=1, status='accepted' WHERE id=?",
            (new_uses, still_active, invitation_id)
        )
        cursor.execute(
            "UPDATE users SET store_id=?, status='active', role='team_member', account_type='member' WHERE email=?",
            (store_id, user_email)
        )
        conn.commit()
        return store_id
    except Exception:
        conn.rollback()
        return None
    finally:
        conn.close()

def decline_invitation_by_id(invitation_id):
    conn = get_db_connection()
    try:
        conn.execute("UPDATE invitations SET status='declined', is_active=0 WHERE id=?", (invitation_id,))
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()

def get_pending_invitations(store_id):
    conn = get_db_connection()
    rows = conn.execute(
        "SELECT * FROM invitations WHERE store_id=? AND is_active=1 ORDER BY id DESC",
        (store_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_invitations_for_email(invited_email):
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT i.*, s.name as store_name
           FROM invitations i
           LEFT JOIN stores s ON i.store_id = s.id
           WHERE i.invited_email=? AND i.status='pending' AND i.is_active=1
           ORDER BY i.id DESC""",
        (invited_email,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Notification helpers ──────────────────────────────────────────────────────

def create_notification(user_id, notif_type, reference_id=None):
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO notifications (user_id, type, reference_id) VALUES (?, ?, ?)',
            (user_id, notif_type, reference_id)
        )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False
    finally:
        conn.close()

def get_notifications_for_user(user_email, include_read=False):
    conn = get_db_connection()
    query = """
        SELECT n.id, n.user_id, n.type, n.reference_id, n.read, n.created_at,
               i.invited_email, i.invited_by, i.store_id, i.status as inv_status,
               i.expires_at, i.token,
               s.name as store_name
        FROM notifications n
        LEFT JOIN invitations i ON n.reference_id = i.id
        LEFT JOIN stores s ON i.store_id = s.id
        WHERE n.user_id = ?
    """
    if not include_read:
        query += " AND n.read = 0"
    query += " ORDER BY n.created_at DESC LIMIT 50"
    rows = conn.execute(query, (user_email,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def mark_notification_read(notification_id, user_email):
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET read=1 WHERE id=? AND user_id=?', (notification_id, user_email))
    conn.commit()
    conn.close()

def mark_all_notifications_read(user_email):
    conn = get_db_connection()
    conn.execute('UPDATE notifications SET read=1 WHERE user_id=?', (user_email,))
    conn.commit()
    conn.close()

def get_unread_notification_count(user_email):
    conn = get_db_connection()
    row = conn.execute('SELECT COUNT(*) FROM notifications WHERE user_id=? AND read=0', (user_email,)).fetchone()
    conn.close()
    return row[0] if row else 0

# ── Activity Log helpers ──────────────────────────────────────────────────────

def log_activity(store_id, user_email, action, details_dict=None):
    import json
    details_json = json.dumps(details_dict) if details_dict else None
    conn = get_db_connection()
    try:
        conn.execute(
            'INSERT INTO activity_logs (store_id, user_email, action, details) VALUES (?, ?, ?, ?)',
            (store_id, user_email, action, details_json)
        )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()

def get_activity_logs(store_id, user_email_filter=None, start_date=None, end_date=None, limit=100):
    conn = get_db_connection()
    query = '''
        SELECT al.id, al.store_id, al.user_email, u.name as user_name,
               al.action, al.details, al.created_at
        FROM activity_logs al
        LEFT JOIN users u ON al.user_email = u.email
        WHERE al.store_id = ? AND al.is_deleted = 0
          AND (u.role IS NULL OR u.role != 'shop_admin')
          AND (u.account_type IS NULL OR u.account_type != 'admin')
    '''
    params = [store_id]
    if user_email_filter:
        query += ' AND al.user_email = ?'
        params.append(user_email_filter)
    if start_date:
        query += ' AND al.created_at >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND al.created_at <= ?'
        params.append(end_date)
    query += ' ORDER BY al.created_at DESC LIMIT ?'
    params.append(limit)
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_store_users_for_filter(store_id):
    conn = get_db_connection()
    rows = conn.execute(
        '''SELECT DISTINCT al.user_email, u.name
           FROM activity_logs al
           LEFT JOIN users u ON al.user_email = u.email
           WHERE al.store_id = ? AND al.is_deleted = 0
             AND (u.role IS NULL OR u.role != 'shop_admin')
             AND (u.account_type IS NULL OR u.account_type != 'admin')''',
        (store_id,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

# ── Transaction helpers ───────────────────────────────────────────────────────

def verify_dataset_ownership(dataset_id, user_email):
    """Verify that dataset exists and belongs to user_email."""
    if not dataset_id or not user_email:
        return None
    conn = get_db_connection()
    row = conn.execute('SELECT * FROM datasets WHERE id = ? AND user_email = ?', (dataset_id, user_email)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_transactions(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = 'SELECT t.id, ti.item FROM transactions t JOIN transaction_items ti ON t.id = ti.transaction_id'
    conditions, params = [], []
    if dataset_id:
        conditions.append("t.dataset_id = ?")
        params.append(dataset_id)
    if user_email:
        conditions.append("t.user_email = ?")
        params.append(user_email)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY t.id"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    if not rows:
        return None
    transactions_map = {}
    for row in rows:
        tx_id = row['id']
        if tx_id not in transactions_map:
            transactions_map[tx_id] = []
        transactions_map[tx_id].append(row['item'])
    return [transactions_map[k] for k in sorted(transactions_map.keys())]

def get_transaction_basket_values(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = 'SELECT t.id, t.basket_value FROM transactions t'
    conditions, params = [], []
    if dataset_id:
        conditions.append("t.dataset_id = ?")
        params.append(dataset_id)
    if user_email:
        conditions.append("t.user_email = ?")
        params.append(user_email)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY t.id"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    if not rows:
        return []
    return [float(r['basket_value']) if r['basket_value'] is not None else 0.0 for r in sorted(rows, key=lambda r: r['id'])]

def get_transactions_with_dates(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = 'SELECT t.id, t.created_at, ti.item FROM transactions t JOIN transaction_items ti ON t.id = ti.transaction_id'
    conditions, params = [], []
    if dataset_id:
        conditions.append("t.dataset_id = ?")
        params.append(dataset_id)
    if user_email:
        conditions.append("t.user_email = ?")
        params.append(user_email)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY t.id"
    rows = conn.execute(query, params).fetchall()
    conn.close()
    if not rows:
        return []
    transactions_map = {}
    for row in rows:
        tx_id = row['id']
        if tx_id not in transactions_map:
            transactions_map[tx_id] = {'date': row['created_at'], 'items': []}
        transactions_map[tx_id]['items'].append(row['item'])
    return [transactions_map[k] for k in sorted(transactions_map.keys())]



def clear_transactions(user_email=None, dataset_id=None):
    conn = get_db_connection()
    query = 'DELETE FROM transactions'
    conditions, params = [], []
    if user_email:
        conditions.append("user_email = ?")
        params.append(user_email)
    if dataset_id:
        conditions.append("dataset_id = ?")
        params.append(dataset_id)
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    conn.execute(query, params)
    conn.commit()
    conn.close()

def add_transaction(items, user_email=None, dataset_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        for item in list(set(items)):
            cursor.execute('INSERT OR IGNORE INTO products (name) VALUES (?)', (item,))
        cursor.execute('INSERT INTO transactions (dataset_id, user_email) VALUES (?, ?)', (dataset_id, user_email))
        tx_id = cursor.lastrowid
        cursor.executemany('INSERT INTO transaction_items (transaction_id, item) VALUES (?, ?)', [(tx_id, item) for item in items])
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()
    return tx_id

def add_transactions(list_of_items, dataset_id=None, user_email=None, basket_values=None, dates=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        all_items = list(set(item for sublist in list_of_items for item in sublist))
        for item in all_items:
            cursor.execute('INSERT OR IGNORE INTO products (name) VALUES (?)', (item,))
        for i, items in enumerate(list_of_items):
            bv = float(basket_values[i]) if basket_values and i < len(basket_values) else None
            dt = dates[i] if dates and i < len(dates) and dates[i] else None
            if dt:
                cursor.execute('INSERT INTO transactions (dataset_id, user_email, basket_value, created_at) VALUES (?, ?, ?, ?)', (dataset_id, user_email, bv, dt))
            else:
                cursor.execute('INSERT INTO transactions (dataset_id, user_email, basket_value) VALUES (?, ?, ?)', (dataset_id, user_email, bv))
            tx_id = cursor.lastrowid
            cursor.executemany('INSERT INTO transaction_items (transaction_id, item) VALUES (?, ?)', [(tx_id, item) for item in items])
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def get_datasets(user_email=None):
    conn = get_db_connection()
    if user_email:
        rows = conn.execute('''
            SELECT d.*, u.name as user_name 
            FROM datasets d 
            LEFT JOIN users u ON d.user_email = u.email 
            WHERE d.user_email = ? 
            ORDER BY d.upload_date DESC, d.id DESC
        ''', (user_email,)).fetchall()
    else:
        rows = conn.execute('''
            SELECT d.*, u.name as user_name 
            FROM datasets d 
            LEFT JOIN users u ON d.user_email = u.email 
            ORDER BY d.upload_date DESC, d.id DESC
        ''').fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_datasets_by_store(store_id):
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT d.*, u.name as user_name 
        FROM datasets d 
        LEFT JOIN users u ON d.user_email = u.email 
        WHERE u.store_id = ? OR d.user_email IN (SELECT owner_email FROM stores WHERE id = ?)
        ORDER BY d.upload_date DESC, d.id DESC
    ''', (store_id, store_id)).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_dataset_by_id(dataset_id, user_email=None):
    conn = get_db_connection()
    if user_email:
        row = conn.execute('SELECT * FROM datasets WHERE id = ? AND user_email = ?', (dataset_id, user_email)).fetchone()
    else:
        row = conn.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

def add_dataset(name, transaction_count, unique_items, user_email=None, file_hash=None,
                market_type='Default/unknown', basket_avg=None, date_range_days=None,
                missing_count=0, duplicates_count=0, columns_detected=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cols_json = json.dumps(columns_detected) if columns_detected and isinstance(columns_detected, (list, dict)) else columns_detected
    cursor.execute(
        'INSERT INTO datasets (name, user_email, file_hash, market_type, transaction_count, unique_items, basket_avg, date_range_days, missing_count, duplicates_count, columns_detected) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (name, user_email, file_hash, market_type, transaction_count, unique_items, basket_avg, date_range_days, missing_count, duplicates_count, cols_json)
    )
    ds_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return ds_id

def get_dataset_by_hash(file_hash, user_email=None):
    conn = get_db_connection()
    if user_email:
        row = conn.execute('SELECT * FROM datasets WHERE file_hash = ? AND user_email = ? ORDER BY upload_date DESC, id DESC LIMIT 1', (file_hash, user_email)).fetchone()
    else:
        row = conn.execute('SELECT * FROM datasets WHERE file_hash = ? ORDER BY upload_date DESC, id DESC LIMIT 1', (file_hash,)).fetchone()
    conn.close()
    return dict(row) if row else None

def transactions_exist(dataset_id, user_email=None):
    conn = get_db_connection()
    if user_email:
        row = conn.execute('SELECT COUNT(*) FROM transactions WHERE dataset_id = ? AND user_email = ?', (dataset_id, user_email)).fetchone()
    else:
        row = conn.execute('SELECT COUNT(*) FROM transactions WHERE dataset_id = ?', (dataset_id,)).fetchone()
    count = row[0] if row else 0
    conn.close()
    return count > 0

def cleanup_duplicate_datasets(user_email=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    q1 = 'DELETE FROM datasets WHERE id NOT IN (SELECT MAX(id) FROM datasets WHERE file_hash IS NOT NULL GROUP BY user_email, file_hash) AND file_hash IS NOT NULL'
    q2 = 'DELETE FROM datasets WHERE id NOT IN (SELECT MAX(id) FROM datasets GROUP BY user_email, name, transaction_count)'
    if user_email:
        cursor.execute(q1 + ' AND user_email = ?', (user_email,))
        cursor.execute(q2 + ' AND user_email = ?', (user_email,))
    else:
        cursor.execute(q1)
        cursor.execute(q2)
    conn.commit()
    conn.close()

def delete_dataset(dataset_id, user_email=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    if user_email:
        cursor.execute('DELETE FROM datasets WHERE id = ? AND user_email = ?', (dataset_id, user_email))
    else:
        cursor.execute('DELETE FROM datasets WHERE id = ?', (dataset_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_products_for_user(user_email=None):
    conn = get_db_connection()
    if user_email:
        rows = conn.execute('''
            SELECT DISTINCT ti.item as name, COUNT(DISTINCT t.id) as tx_count
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            WHERE t.user_email = ?
            GROUP BY ti.item
            ORDER BY tx_count DESC, ti.item ASC
        ''', (user_email,)).fetchall()
    else:
        rows = conn.execute('''
            SELECT DISTINCT ti.item as name, COUNT(DISTINCT t.id) as tx_count
            FROM transaction_items ti
            JOIN transactions t ON ti.transaction_id = t.id
            GROUP BY ti.item
            ORDER BY tx_count DESC, ti.item ASC
        ''').fetchall()
    conn.close()
    return [{'id': idx + 1, 'name': row['name'], 'count': row['tx_count']} for idx, row in enumerate(rows)]

def get_products():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM products ORDER BY name').fetchall()
    conn.close()
    return [dict(row) for row in rows]

def delete_product(product_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM products WHERE id = ?', (product_id,))
    conn.commit()
    conn.close()
    return True

def add_product(name, category='Uncategorized', price=0.0, stock=0):
    conn = get_db_connection()
    cursor = conn.cursor()
    success = False
    try:
        cursor.execute('INSERT INTO products (name, category, price, stock) VALUES (?, ?, ?, ?)', (name, category, price, stock))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        success = False
    finally:
        conn.close()
    return success
