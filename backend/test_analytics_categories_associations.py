import unittest
import json
import sqlite3
import os
import sys
import io
import pandas as pd

# Ensure backend directory is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import app
import db

class AnalyticsCategoriesAssociationsTestCase(unittest.TestCase):
    def setUp(self):
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()

        # Create a test user
        self.user_email = "store_owner@example.com"
        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                       (self.user_email, "securepwd123", "Store Owner", "shop_admin"))
        conn.commit()
        conn.close()

        self.token = app.generate_auth_token(self.user_email)
        self.headers = {'Authorization': f'Bearer {self.token}'}

    def test_five_column_dataset_parsing_and_upload(self):
        """Verify 5-column dataset (Transaction ID, Product Name, Category, Quantity, Date) is parsed."""
        csv_data = (
            "Transaction ID,Product Name,Category,Quantity,Date\n"
            "TX-101,Espresso,Coffee,1,2026-09-14 08:00\n"
            "TX-101,Croissant,Bakery,1,2026-09-14 08:00\n"
            "TX-102,Latte,Coffee,2,2026-09-14 08:30\n"
            "TX-102,Blueberry Muffin,Bakery,1,2026-09-14 08:30\n"
            "TX-103,Green Tea,Tea,1,2026-09-14 09:00\n"
            "TX-103,Croissant,Bakery,2,2026-09-14 09:00\n"
        )
        data = {
            'file': (io.BytesIO(csv_data.encode('utf-8')), 'test_five_cols.csv')
        }
        res = self.client.post('/api/upload', data=data, content_type='multipart/form-data', headers=self.headers)
        self.assertEqual(res.status_code, 200, res.data)
        res_data = json.loads(res.data)
        
        ds_id = res_data['dataset_id']
        self.assertEqual(res_data['transaction_count'], 3)
        self.assertIn('categories', res_data)
        # Categories must be dynamically discovered: Bakery, Coffee, Tea
        self.assertEqual(sorted(res_data['categories']), ['Bakery', 'Coffee', 'Tea'])

        # Verify stats endpoint returns dynamic categories
        stats_res = self.client.get(f'/api/stats?dataset_id={ds_id}', headers=self.headers)
        self.assertEqual(stats_res.status_code, 200)
        stats_data = json.loads(stats_res.data)
        self.assertEqual(sorted(stats_data['categories']), ['Bakery', 'Coffee', 'Tea'])
        self.assertIn('Croissant', stats_data['product_categories'])
        self.assertEqual(stats_data['product_categories']['Croissant'], 'Bakery')
        self.assertEqual(stats_data['product_categories']['Espresso'], 'Coffee')

    def test_dynamic_categories_across_different_datasets(self):
        """Verify uploading another dataset with different categories regenerates categories without hardcoding."""
        # Dataset 1: Retail store with Apparel, Footwear, Accessories
        csv_1 = (
            "Transaction ID,Product Name,Category,Quantity,Date\n"
            "T1,Running Shoes,Footwear,1,2026-01-01\n"
            "T1,Sport Socks,Apparel,2,2026-01-01\n"
            "T2,Cap,Accessories,1,2026-01-02\n"
        )
        res1 = self.client.post('/api/upload',
                                data={'file': (io.BytesIO(csv_1.encode('utf-8')), 'apparel_ds.csv')},
                                content_type='multipart/form-data', headers=self.headers)
        self.assertEqual(res1.status_code, 200)
        ds1_id = json.loads(res1.data)['dataset_id']
        cats1 = db.get_categories_for_dataset(ds1_id, user_email=self.user_email)
        self.assertEqual(sorted(cats1), ['Accessories', 'Apparel', 'Footwear'])

        # Dataset 2: Hardware store with Tools, Paint, Plumbing
        csv_2 = (
            "Transaction ID,Product Name,Category,Quantity,Date\n"
            "H1,Hammer,Tools,1,2026-02-01\n"
            "H1,Nails,Tools,50,2026-02-01\n"
            "H2,Blue Paint,Paint,2,2026-02-02\n"
            "H2,PVC Pipe,Plumbing,3,2026-02-02\n"
        )
        res2 = self.client.post('/api/upload',
                                data={'file': (io.BytesIO(csv_2.encode('utf-8')), 'hardware_ds.csv')},
                                content_type='multipart/form-data', headers=self.headers)
        self.assertEqual(res2.status_code, 200)
        ds2_id = json.loads(res2.data)['dataset_id']
        cats2 = db.get_categories_for_dataset(ds2_id, user_email=self.user_email)
        self.assertEqual(sorted(cats2), ['Paint', 'Plumbing', 'Tools'])
        # Ensure categories from dataset 1 are not mixed into dataset 2
        self.assertNotIn('Apparel', cats2)
        self.assertNotIn('Footwear', cats2)

    def test_multi_product_associated_products_no_one_product_limit(self):
        """Verify multi-product selection and that Associated Products exposes all qualifying results (not limited to 1)."""
        # Baskets with multiple associated products D, E, F when A + B are purchased
        csv_assoc = (
            "Transaction ID,Product Name,Category,Quantity,Date\n"
            "1,Item A,Category 1,1,2026-05-01\n"
            "1,Item B,Category 1,1,2026-05-01\n"
            "1,Item D,Category 2,1,2026-05-01\n"
            "1,Item E,Category 3,1,2026-05-01\n"
            "1,Item F,Category 4,1,2026-05-01\n"
            "2,Item A,Category 1,1,2026-05-02\n"
            "2,Item B,Category 1,1,2026-05-02\n"
            "2,Item D,Category 2,1,2026-05-02\n"
            "2,Item E,Category 3,1,2026-05-02\n"
            "2,Item F,Category 4,1,2026-05-02\n"
            "3,Item A,Category 1,1,2026-05-03\n"
            "3,Item B,Category 1,1,2026-05-03\n"
            "3,Item D,Category 2,1,2026-05-03\n"
            "3,Item E,Category 3,1,2026-05-03\n"
        )
        res = self.client.post('/api/upload',
                                data={'file': (io.BytesIO(csv_assoc.encode('utf-8')), 'multi_assoc.csv')},
                                content_type='multipart/form-data', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        ds_id = json.loads(res.data)['dataset_id']

        # Multi-product query: Item A + Item B
        co_res = self.client.get(f'/api/frequently_bought_together?product=Item%20A&product=Item%20B&dataset_id={ds_id}',
                                 headers=self.headers)
        self.assertEqual(co_res.status_code, 200)
        co_data = json.loads(co_res.data)
        
        assoc_items = co_data['frequently_bought_together']
        assoc_names = [it['product_name'] for it in assoc_items]

        # Critical requirement: ALL qualifying items (Item D, Item E, Item F) must be returned! Not limited to 1!
        self.assertGreater(len(assoc_items), 1, "Associated products must not be limited to 1 item!")
        self.assertIn('Item D', assoc_names)
        self.assertIn('Item E', assoc_names)
        self.assertIn('Item F', assoc_names)

        # Cross-category verification: Associated Products shows items across Category 2, 3, 4
        categories_in_assoc = set(it['category'] for it in assoc_items)
        self.assertIn('Category 2', categories_in_assoc)
        self.assertIn('Category 3', categories_in_assoc)
        self.assertIn('Category 4', categories_in_assoc)

    def test_multi_item_transactions_mining_patterns(self):
        """Verify transactions containing 3, 5, 10 items are mined and preserved."""
        # 10-item transaction
        items_10 = [f"Product_{i}" for i in range(1, 11)]
        tx_list = [items_10, items_10, items_10[:5]]
        ds_id = db.add_dataset(name="large_baskets.csv", transaction_count=len(tx_list), unique_items=10, user_email=self.user_email)
        db.add_transactions(tx_list, dataset_id=ds_id, user_email=self.user_email)

        mine_res = self.client.post('/api/mine',
                                    data=json.dumps({'dataset_id': ds_id, 'min_support': 0.1, 'min_confidence': 0.5}),
                                    content_type='application/json',
                                    headers=self.headers)
        self.assertEqual(mine_res.status_code, 200)
        mine_data = json.loads(mine_res.data)
        
        # Verify multi-item frequent itemsets exist (sets with 3+ items)
        itemsets = mine_data['frequent_itemsets']
        max_itemset_len = max(len(s['items']) for s in itemsets) if itemsets else 0
        self.assertGreaterEqual(max_itemset_len, 3, "Mining engine must support and preserve itemsets of 3+ items.")

if __name__ == '__main__':
    unittest.main()
