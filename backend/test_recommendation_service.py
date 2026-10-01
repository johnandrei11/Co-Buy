import unittest
import json
import sqlite3
import os
import sys
import io

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import app
import db
from recommendation_service import RecommendationEngine, generate_recommendation_id

class RecommendationServiceTestCase(unittest.TestCase):
    def setUp(self):
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()

        self.user_email = "advisory_test@example.com"
        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                       (self.user_email, "securepwd123", "Advisory Tester", "shop_admin"))
        conn.commit()
        conn.close()

        self.token = app.generate_auth_token(self.user_email)
        self.headers = {'Authorization': f'Bearer {self.token}'}

    def test_v2_recommendations_endpoint_contract(self):
        """Verify /api/v2/recommendations returns strictly normalized BusinessRecommendation payload."""
        csv_data = (
            "Transaction ID,Product Name,Category,Quantity,Date\n"
            "T1,Coffee,Beverage,1,2026-09-01 08:00\n"
            "T1,Chocolate Chip Cookie,Bakery,1,2026-09-01 08:00\n"
            "T2,Coffee,Beverage,1,2026-09-01 08:15\n"
            "T2,Chocolate Chip Cookie,Bakery,1,2026-09-01 08:15\n"
            "T3,Coffee,Beverage,1,2026-09-01 08:30\n"
            "T3,Chocolate Chip Cookie,Bakery,1,2026-09-01 08:30\n"
            "T4,Coffee,Beverage,1,2026-09-01 08:45\n"
            "T4,Croissant,Bakery,1,2026-09-01 08:45\n"
            "T5,Coffee,Beverage,1,2026-09-01 09:00\n"
            "T5,Chocolate Chip Cookie,Bakery,1,2026-09-01 09:00\n"
            "T6,Bagel,Bakery,1,2026-09-01 09:15\n"
            "T6,Cream Cheese,Dairy,1,2026-09-01 09:15\n"
            "T7,Bagel,Bakery,1,2026-09-01 09:30\n"
            "T7,Cream Cheese,Dairy,1,2026-09-01 09:30\n"
            "T8,Iced Tea,Beverage,1,2026-09-01 10:00\n"
            "T8,French Fries,Hot Food,1,2026-09-01 10:00\n"
            "T9,Iced Tea,Beverage,1,2026-09-01 10:15\n"
            "T9,French Fries,Hot Food,1,2026-09-01 10:15\n"
            "T10,Iced Tea,Beverage,1,2026-09-01 10:30\n"
            "T10,French Fries,Hot Food,1,2026-09-01 10:30\n"
        )
        upload_res = self.client.post(
            '/api/upload',
            data={'file': (io.BytesIO(csv_data.encode('utf-8')), 'advisory_test_data.csv')},
            content_type='multipart/form-data',
            headers=self.headers
        )
        self.assertEqual(upload_res.status_code, 200, upload_res.data)
        ds_id = json.loads(upload_res.data)['dataset_id']

        # Query /api/v2/recommendations
        res = self.client.get(f'/api/v2/recommendations?dataset_id={ds_id}', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)

        # 1. Structure invariants
        self.assertIn('category_counts', data)
        self.assertIn('recommendations', data)
        self.assertIn('analysis_period', data)
        self.assertIn('pagination', data)
        self.assertIn('empty_reasons', data)

        counts = data['category_counts']
        for cat in ['ALL', 'GROW', 'SELL_MORE', 'WATCH', 'OPTIMIZE', 'REVIEW']:
            self.assertIn(cat, counts)
            self.assertIsInstance(counts[cat], int)

        # 2. Check recommendation card schema conformity (Section 10)
        recs = data['recommendations']
        self.assertGreater(len(recs), 0)
        first = recs[0]
        self.assertIn('id', first)
        self.assertIn('category', first)
        self.assertIn(first['category'], ['GROW', 'SELL_MORE', 'WATCH', 'OPTIMIZE', 'REVIEW'])
        self.assertIn('insightType', first)
        self.assertIn('priority', first)
        self.assertIn('products', first)
        self.assertGreaterEqual(len(first['products']), 2)
        self.assertIn('summary', first)
        self.assertIn('context', first)
        self.assertIn('suggestedAction', first)
        self.assertIn('details', first)

        details = first['details']
        self.assertIn('rationale', details)
        self.assertIn('observedBehavior', details)
        self.assertIn('considerations', details)
        self.assertIsInstance(details['considerations'], list)
        self.assertIn('supportingData', details)

        supporting = details['supportingData']
        self.assertIn('supportPct', supporting)
        self.assertIn('confidencePct', supporting)
        self.assertIn('liftRatio', supporting)
        self.assertIn('transactionCount', supporting)

        # 3. Test filtering by category
        res_grow = self.client.get(f'/api/v2/recommendations?dataset_id={ds_id}&category=GROW', headers=self.headers)
        self.assertEqual(res_grow.status_code, 200)
        data_grow = json.loads(res_grow.data)
        for r in data_grow['recommendations']:
            self.assertEqual(r['category'], 'GROW')

    def test_insufficient_data_state(self):
        """Verify datasets below minimum threshold gracefully return insufficient data state."""
        csv_sparse = (
            "Transaction ID,Product Name\n"
            "T1,Apple\n"
            "T2,Banana\n"
        )
        upload_res = self.client.post(
            '/api/upload',
            data={'file': (io.BytesIO(csv_sparse.encode('utf-8')), 'sparse.csv')},
            content_type='multipart/form-data',
            headers=self.headers
        )
        ds_id = json.loads(upload_res.data)['dataset_id']

        res = self.client.get(f'/api/v2/recommendations?dataset_id={ds_id}', headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['is_insufficient_data'])
        self.assertIn("Not enough purchasing activity yet", data['message'])

    def test_legacy_mine_endpoint_unbroken(self):
        """Verify existing /api/mine endpoint still functions correctly for backward compatibility."""
        csv_data = (
            "Transaction ID,Product Name\n"
            "T1,Coffee,Cookie\n"
            "T2,Coffee,Cookie\n"
            "T3,Coffee,Cookie\n"
            "T4,Coffee,Cookie\n"
            "T5,Tea,Muffin\n"
            "T6,Tea,Muffin\n"
        )
        upload_res = self.client.post(
            '/api/upload',
            data={'file': (io.BytesIO(csv_data.encode('utf-8')), 'legacy_check.csv')},
            content_type='multipart/form-data',
            headers=self.headers
        )
        ds_id = json.loads(upload_res.data)['dataset_id']
        mine_res = self.client.post('/api/mine', json={'dataset_id': ds_id, 'algorithm': 'auto'}, headers=self.headers)
        self.assertEqual(mine_res.status_code, 200)
        mine_data = json.loads(mine_res.data)
        self.assertIn('rules', mine_data)
        self.assertIn('frequent_itemsets', mine_data)

    def test_date_range_filtering(self):
        """Verify date_range parameter dynamically slices transactions and analysis period."""
        csv_data = (
            "Transaction ID,Product Name,Date\n"
            "T1,Coffee,2026-01-01 08:00\n"
            "T1,Croissant,2026-01-01 08:00\n"
            "T2,Coffee,2026-01-02 08:00\n"
            "T2,Croissant,2026-01-02 08:00\n"
            "T3,Coffee,2026-01-03 08:00\n"
            "T3,Croissant,2026-01-03 08:00\n"
            "T4,Coffee,2026-01-04 08:00\n"
            "T4,Croissant,2026-01-04 08:00\n"
            "T5,Coffee,2026-01-05 08:00\n"
            "T5,Croissant,2026-01-05 08:00\n"
            "T6,Tea,2026-09-01 08:00\n"
            "T6,Bagel,2026-09-01 08:00\n"
            "T7,Tea,2026-09-02 08:00\n"
            "T7,Bagel,2026-09-02 08:00\n"
            "T8,Tea,2026-09-03 08:00\n"
            "T8,Bagel,2026-09-03 08:00\n"
            "T9,Tea,2026-09-04 08:00\n"
            "T9,Bagel,2026-09-04 08:00\n"
            "T10,Tea,2026-09-05 08:00\n"
            "T10,Bagel,2026-09-05 08:00\n"
        )
        upload_res = self.client.post(
            '/api/upload',
            data={'file': (io.BytesIO(csv_data.encode('utf-8')), 'date_range_test.csv')},
            content_type='multipart/form-data',
            headers=self.headers
        )
        ds_id = json.loads(upload_res.data)['dataset_id']

        res_all = self.client.get(f'/api/v2/recommendations?dataset_id={ds_id}&date_range=all', headers=self.headers)
        self.assertEqual(res_all.status_code, 200)
        data_all = json.loads(res_all.data)
        self.assertEqual(data_all['total_transactions'], 10)
        self.assertEqual(data_all['analysis_period']['start'], 'Jan 01, 2026')
        self.assertEqual(data_all['analysis_period']['end'], 'Sep 05, 2026')

        res_30 = self.client.get(f'/api/v2/recommendations?dataset_id={ds_id}&date_range=30d', headers=self.headers)
        self.assertEqual(res_30.status_code, 200)
        data_30 = json.loads(res_30.data)
        self.assertEqual(data_30['total_transactions'], 5)
        self.assertEqual(data_30['analysis_period']['start'], 'Aug 06, 2026')
        self.assertEqual(data_30['analysis_period']['end'], 'Sep 05, 2026')

if __name__ == '__main__':
    unittest.main()
