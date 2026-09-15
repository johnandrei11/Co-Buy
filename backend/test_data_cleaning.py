import pandas as pd
import io
import datetime
from datetime import datetime, timedelta, timezone
import re

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

    # 5. Fallback via pandas to_datetime (handles textual months: 05-May-2026, etc.)
    try:
        dt = pd.to_datetime(sval, errors='coerce')
        if pd.notna(dt):
            return dt.strftime('%Y-%m-%d')
    except Exception:
        pass

    return None

def format_date_human(val, full_month=False):
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
    if pd.isna(raw) or raw is None:
        return None
    s = str(raw).strip()
    # Strip leading/trailing quotes, asterisks, brackets, punctuation
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

    # 1. Single-column format
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

if __name__ == '__main__':
    csv_raw = (
        'InvoiceNo,StockCode,Description,Quantity,InvoiceDate,UnitPrice\n'
        '536365,85123A,  WHITE HANGING HEART T-LIGHT HOLDER  ,6,2026/03/05 08:26,2.55\n'
        '536365,71053,WHITE METAL LANTERN,6,2026/03/05 08:26,3.39\n'
        '536365,POST,POSTAGE,1,2026/03/05 08:26,18.00\n'
        '536366,22633,HAND WARMER UNION JACK,6,05/03/2026 08:28,1.85\n'
        '536366,22632,HAND WARMER RED POLKA DOT,6,05/03/2026 08:28,1.85\n'
        'C536379,D,Discount,-1,2026/03/05 09:41,27.50\n'
        '536380,22960,"JAM MAKING SET WITH JARS.",-2,2026-03-05 09:45,4.25\n'
        '536381,21756,nan,3,2026.03.05,5.95\n'
        '536381,21757,?COFFEE?,2,2026.03.05,3.50\n'
    )
    df = pd.read_csv(io.StringIO(csv_raw))
    txs, dups, missing, b_vals, days, avg, dates, cols = parse_df_to_transactions(df)
    print("Parsed Transactions:")
    for i, tx in enumerate(txs):
        print(f"  Tx {i+1}: Date={dates[i]} (Human: {format_date_human(dates[i])}) | Items={tx}")
    print(f"Cleaning Stats: missing/noise removed={missing}, duplicates removed={dups}")
    print(f"Detected columns: {cols}")
