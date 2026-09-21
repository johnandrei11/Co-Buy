import unittest
import json
import sqlite3
import os
import sys

current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

import app
import db

class AdminEndpointsTestCase(unittest.TestCase):
    def setUp(self):
        app.app.config['TESTING'] = True
        self.client = app.app.test_client()

        self.sys_admin_email = "sysadmin_test@cobuy.app"
        self.staff_email = "staff_test@cobuy.app"

        conn = db.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT OR REPLACE INTO users (email, password, name, role, account_type) VALUES (?, ?, ?, ?, ?)",
                       (self.sys_admin_email, "secret123", "System Admin Tester", "system_admin", "admin"))
        cursor.execute("INSERT OR REPLACE INTO users (email, password, name, role, account_type) VALUES (?, ?, ?, ?, ?)",
                       (self.staff_email, "secret123", "Staff Tester", "team_member", "member"))
        conn.commit()
        conn.close()

        self.admin_token = app.generate_auth_token(self.sys_admin_email)
        self.staff_token = app.generate_auth_token(self.staff_email)

        self.admin_headers = {'Authorization': f'Bearer {self.admin_token}'}
        self.staff_headers = {'Authorization': f'Bearer {self.staff_token}'}

    def tearDown(self):
        conn = db.get_db_connection()
        conn.execute("PRAGMA foreign_keys = OFF")
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE email IN (?, ?) OR email IN ('testcafe_owner@example.com', 'new_manager@example.com')", (self.sys_admin_email, self.staff_email))
        cursor.execute("DELETE FROM activity_logs WHERE store_id IN (SELECT id FROM stores WHERE name = 'Test Cafe Express') OR user_email IN (?, ?, 'testcafe_owner@example.com', 'new_manager@example.com')", (self.sys_admin_email, self.staff_email))
        cursor.execute("DELETE FROM stores WHERE name = 'Test Cafe Express'")
        conn.commit()
        conn.close()

    def test_admin_endpoints_require_authentication(self):
        """Unauthenticated requests must receive 401."""
        endpoints = [
            ('/api/admin/dashboard-stats', 'GET'),
            ('/api/admin/system-activity', 'GET'),
            ('/api/admin/businesses', 'GET'),
            ('/api/admin/users', 'GET'),
            ('/api/admin/datasets', 'GET'),
            ('/api/admin/analysis-history', 'GET'),
            ('/api/admin/evaluations/datasets', 'GET'),
            ('/api/admin/audit-logs', 'GET'),
            ('/api/admin/settings', 'GET'),
            ('/api/admin/profile', 'GET'),
        ]
        for ep, method in endpoints:
            res = self.client.get(ep)
            self.assertEqual(res.status_code, 401, f"Expected 401 for unauthenticated {ep}, got {res.status_code}")

    def test_non_system_admin_rejected_with_403(self):
        """Non-system-admin users (staff/shop_admin) must be rejected with 403."""
        endpoints = [
            ('/api/admin/dashboard-stats', 'GET'),
            ('/api/admin/system-activity', 'GET'),
            ('/api/admin/businesses', 'GET'),
            ('/api/admin/users', 'GET'),
            ('/api/admin/datasets', 'GET'),
            ('/api/admin/analysis-history', 'GET'),
            ('/api/admin/evaluations/datasets', 'GET'),
            ('/api/admin/audit-logs', 'GET'),
            ('/api/admin/settings', 'GET'),
            ('/api/admin/profile', 'GET'),
        ]
        for ep, method in endpoints:
            res = self.client.get(ep, headers=self.staff_headers)
            self.assertEqual(res.status_code, 403, f"Expected 403 for staff on {ep}, got {res.status_code}")

    def test_admin_dashboard_stats_and_activity(self):
        """System admin can access dashboard stats and system activity."""
        res = self.client.get('/api/admin/dashboard-stats', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('total_businesses', data)
        self.assertIn('active_businesses', data)
        self.assertIn('pending_businesses', data)
        self.assertIn('total_users', data)
        self.assertIn('total_datasets', data)
        self.assertIn('total_analyses', data)
        self.assertIn('businesses_overview', data)
        self.assertIn('recent_activity', data)

        res_act = self.client.get('/api/admin/system-activity?days=30', headers=self.admin_headers)
        self.assertEqual(res_act.status_code, 200)
        act_data = res_act.get_json()
        self.assertIn('series', act_data)

    def test_business_crud_and_approval_workflow(self):
        """System admin can list, create, update, approve, and reject businesses."""
        # 1. List businesses
        res = self.client.get('/api/admin/businesses', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn('businesses', data)
        self.assertIn('counts', data)

        # 2. Create a pending business
        create_res = self.client.post('/api/admin/businesses', json={
            'name': 'Test Cafe Express',
            'owner_email': 'testcafe_owner@example.com',
            'business_type': 'Coffee Shop',
            'address': '123 Test Street',
            'contact_phone': '555-0199',
            'status': 'Pending Approval'
        }, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 201)
        created = create_res.get_json()['business']
        biz_id = created['id']
        self.assertEqual(created['status'], 'Pending Approval')

        # 3. View business details (with 5 tabs data)
        detail_res = self.client.get(f'/api/admin/businesses/{biz_id}', headers=self.admin_headers)
        self.assertEqual(detail_res.status_code, 200)
        detail_data = detail_res.get_json()
        self.assertIn('business', detail_data)
        self.assertIn('users', detail_data)
        self.assertIn('datasets', detail_data)
        self.assertIn('analyses', detail_data)
        self.assertIn('activity', detail_data)

        # 4. Approve business
        appr_res = self.client.post(f'/api/admin/businesses/{biz_id}/approve', headers=self.admin_headers)
        self.assertEqual(appr_res.status_code, 200)

        # Verify status is now Active
        updated_biz = db.get_business_by_id(biz_id)
        self.assertEqual(updated_biz['status'], 'Active')
        self.assertEqual(updated_biz['approved_by'], self.sys_admin_email)

        # 5. Reject business
        rej_res = self.client.post(f'/api/admin/businesses/{biz_id}/reject', json={
            'reason': 'Missing tax documents'
        }, headers=self.admin_headers)
        self.assertEqual(rej_res.status_code, 200)
        rejected_biz = db.get_business_by_id(biz_id)
        self.assertEqual(rejected_biz['status'], 'Rejected')
        self.assertEqual(rejected_biz['rejection_reason'], 'Missing tax documents')

        # Cleanup created business and owner user
        conn = db.get_db_connection()
        conn.execute("PRAGMA foreign_keys = OFF")
        conn.execute("DELETE FROM activity_logs WHERE store_id = ?", (biz_id,))
        conn.execute("DELETE FROM users WHERE email = 'testcafe_owner@example.com' OR store_id = ?", (biz_id,))
        conn.execute("DELETE FROM stores WHERE id = ?", (biz_id,))
        conn.commit()
        conn.close()

    def test_user_management(self):
        """System admin can create, update, and manage users across businesses."""
        test_email = "new_manager@example.com"
        # 1. Create user
        create_res = self.client.post('/api/admin/users', json={
            'email': test_email,
            'password': 'Password123!',
            'name': 'Manager Test',
            'role': 'business_admin',
            'status': 'active'
        }, headers=self.admin_headers)
        self.assertEqual(create_res.status_code, 201)

        # 2. Update user
        update_res = self.client.put(f'/api/admin/users/{test_email}', json={
            'name': 'Manager Test Updated',
            'role': 'staff'
        }, headers=self.admin_headers)
        self.assertEqual(update_res.status_code, 200)

        user = db.get_user(test_email)
        self.assertEqual(user['name'], 'Manager Test Updated')
        self.assertEqual(user['role'], 'staff')

        # 3. Reset password
        reset_res = self.client.post(f'/api/admin/users/{test_email}/reset-password', json={
            'new_password': 'BrandNewPassword123'
        }, headers=self.admin_headers)
        self.assertEqual(reset_res.status_code, 200)
        user_after = db.get_user(test_email)
        self.assertEqual(user_after['password'], 'BrandNewPassword123')

        # Cleanup
        conn = db.get_db_connection()
        conn.execute("DELETE FROM users WHERE email = ?", (test_email,))
        conn.commit()
        conn.close()

    def test_settings_and_audit_logs(self):
        """System admin can read/write settings and export audit logs."""
        # 1. Settings GET & PUT
        res = self.client.get('/api/admin/settings', headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        orig_settings = res.get_json()['settings']
        self.assertIn('general', orig_settings)

        put_res = self.client.put('/api/admin/settings', json={
            'app_name': 'CoBuy Enterprise Admin',
            'maintenance_mode': 'false'
        }, headers=self.admin_headers)
        self.assertEqual(put_res.status_code, 200)

        new_settings = db.get_system_settings()
        self.assertEqual(new_settings['general']['app_name'], 'CoBuy Enterprise Admin')

        # 2. Audit logs GET
        log_res = self.client.get('/api/admin/audit-logs', headers=self.admin_headers)
        self.assertEqual(log_res.status_code, 200)
        log_data = log_res.get_json()
        self.assertIn('logs', log_data)
        self.assertIn('total', log_data)

        # 3. Audit logs CSV export
        export_res = self.client.get('/api/admin/audit-logs/export', headers=self.admin_headers)
        self.assertEqual(export_res.status_code, 200)
        self.assertEqual(export_res.mimetype, 'text/csv')
        self.assertIn('ID,Timestamp,Business', export_res.get_data(as_text=True))

if __name__ == '__main__':
    unittest.main()
