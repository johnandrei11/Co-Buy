import unittest
import json
import sqlite3
import os
import sys

# Ensure backend directory is in path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import app
import db

class SecurityAndOwnershipTestCase(unittest.TestCase):
    def setUp(self):
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()

        # Create two test users in database
        self.user_a = "alice_test@example.com"
        self.user_b = "bob_test@example.com"

        # Insert test users directly into database
        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                       (self.user_a, "password123", "Alice Test", "shop_admin"))
        cursor.execute("INSERT OR REPLACE INTO users (email, password, name, role) VALUES (?, ?, ?, ?)",
                       (self.user_b, "password123", "Bob Test", "shop_admin"))
        conn.commit()
        conn.close()

        # Generate cryptographic HMAC tokens for both
        self.token_a = app.generate_auth_token(self.user_a)
        self.token_b = app.generate_auth_token(self.user_b)

        # Create a dataset belonging to Alice
        self.dataset_a_id = db.add_dataset(
            name="alice_sales.csv",
            transaction_count=2,
            unique_items=3,
            user_email=self.user_a,
            market_type="Coffee Shop"
        )
        # Add test transactions for Alice's dataset
        db.add_transactions(
            list_of_items=[["Latte", "Croissant"], ["Espresso"]],
            dataset_id=self.dataset_a_id,
            user_email=self.user_a
        )

        # Set specific dates on transactions for trend testing
        conn = db.get_db_connection()
        tx_rows = conn.execute("SELECT id FROM transactions WHERE dataset_id = ? ORDER BY id", (self.dataset_a_id,)).fetchall()
        if len(tx_rows) >= 2:
            conn.execute("UPDATE transactions SET created_at = '2026-01-10 10:00:00' WHERE id = ?", (tx_rows[0]['id'],))
            conn.execute("UPDATE transactions SET created_at = '2026-01-11 11:00:00' WHERE id = ?", (tx_rows[1]['id'],))
            conn.commit()
        conn.close()

    def tearDown(self):
        # Clean up test datasets and transactions
        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE user_email IN (?, ?)", (self.user_a, self.user_b))
        cursor.execute("DELETE FROM datasets WHERE user_email IN (?, ?)", (self.user_a, self.user_b))
        cursor.execute("DELETE FROM users WHERE email IN (?, ?)", (self.user_a, self.user_b))
        conn.commit()
        conn.close()

    def test_token_cryptographic_verification(self):
        """Test token signing and tampering detection."""
        verified_email = app.verify_auth_token(self.token_a)
        self.assertEqual(verified_email, self.user_a)

        # Tampered token
        parts = self.token_a.split('_')
        tampered_token = f"cobuy_{parts[1]}_tampered_signature_12345"
        self.assertIsNone(app.verify_auth_token(tampered_token))

    def test_unauthenticated_requests_return_401(self):
        """Endpoints must reject unauthenticated requests with 401."""
        protected_endpoints = [
            ('/api/stats', 'GET'),
            ('/api/datasets', 'GET'),
            ('/api/trends', 'GET'),
            ('/api/products', 'GET'),
            ('/api/mine', 'POST'),
            ('/api/frequently_bought_together?product=Latte', 'GET'),
        ]
        for ep, method in protected_endpoints:
            if method == 'GET':
                res = self.client.get(ep)
            else:
                res = self.client.post(ep, json={})
            self.assertEqual(
                res.status_code, 401,
                f"Expected 401 for unauthenticated request to {ep}, got {res.status_code}"
            )

    def test_dataset_ownership_authorization_user_isolation(self):
        """User B must NOT be able to access User A's dataset (returns 403)."""
        # User B attempts to access User A's dataset stats
        headers_b = {'Authorization': f'Bearer {self.token_b}'}
        res = self.client.get(f'/api/stats?dataset_id={self.dataset_a_id}', headers=headers_b)
        self.assertEqual(res.status_code, 403)
        self.assertIn("Forbidden", res.get_json().get("error", ""))

        # User B attempts to mine User A's dataset
        res = self.client.post('/api/mine', json={'dataset_id': self.dataset_a_id}, headers=headers_b)
        self.assertEqual(res.status_code, 403)

        # User B attempts to delete User A's dataset
        res = self.client.delete(f'/api/datasets/{self.dataset_a_id}', headers=headers_b)
        self.assertEqual(res.status_code, 403)

        # User B attempts to get trends for User A's dataset
        res = self.client.get(f'/api/trends?dataset_id={self.dataset_a_id}', headers=headers_b)
        self.assertEqual(res.status_code, 403)

    def test_owner_can_access_own_dataset(self):
        """User A should be able to access their own dataset (returns 200)."""
        headers_a = {'Authorization': f'Bearer {self.token_a}'}
        res = self.client.get(f'/api/stats?dataset_id={self.dataset_a_id}', headers=headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("total_transactions"), 2)

    def test_dynamic_trends_without_synthetic_sine_wave(self):
        """Verify trends endpoint returns actual dates without synthetic sine points."""
        headers_a = {'Authorization': f'Bearer {self.token_a}'}
        res = self.client.get(f'/api/trends?dataset_id={self.dataset_a_id}', headers=headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("trends", data)
        trends = data["trends"]
        # In setup, transactions are on 2026-01-10 and 2026-01-11
        dates = [t["date"] for t in trends]
        self.assertIn("2026-01-10", dates)
        self.assertIn("2026-01-11", dates)

    def test_products_endpoint_returns_user_products(self):
        """Verify /api/products returns distinct items belonging to user."""
        headers_a = {'Authorization': f'Bearer {self.token_a}'}
        res = self.client.get('/api/products', headers=headers_a)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("products", data)
        prod_names = [p["name"] for p in data["products"]]
        self.assertIn("Latte", prod_names)
        self.assertIn("Croissant", prod_names)
        self.assertIn("Espresso", prod_names)

        # Bob has no products
        headers_b = {'Authorization': f'Bearer {self.token_b}'}
        res_b = self.client.get('/api/products', headers=headers_b)
        self.assertEqual(res_b.status_code, 200)
        data_b = res_b.get_json()
        self.assertEqual(len(data_b.get("products", [])), 0)

if __name__ == '__main__':
    unittest.main()
