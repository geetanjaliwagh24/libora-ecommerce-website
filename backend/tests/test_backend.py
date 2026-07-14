import unittest
import json
from app import create_app, db
from app.models import User, Product, Category, Seller, Order, FraudLog, CartItem, OrderItem
from config import Config

class TestConfig(Config):
    TESTING = True
    RATELIMIT_ENABLED = False
    SECRET_KEY = 'test-secret-key'
    JWT_SECRET_KEY = 'test-jwt-secret-key'
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:' # Use in-memory DB for tests
    FRAUD_VELOCITY_LIMIT_ORDERS = 2  # Tighten thresholds for easy testing
    FRAUD_VELOCITY_LIMIT_WINDOW = 60
    FRAUD_PRICE_ANOMALY_THRESHOLD = 0.25
    FRAUD_HIGH_VOLUME_THRESHOLD = 1000.0


class BackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        
        # Clear database and recreate tables
        db.drop_all()
        db.create_all()
        
        self.setup_test_data()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def setup_test_data(self):
        # Create users
        self.admin = User(email='admin@test.com', role='admin')
        self.admin.set_password('admin123')
        
        self.seller_verified = User(email='seller1@test.com', role='seller')
        self.seller_verified.set_password('seller123')
        
        self.seller_unverified = User(email='seller2@test.com', role='seller')
        self.seller_unverified.set_password('seller123')
        
        self.buyer = User(email='buyer@test.com', role='buyer')
        self.buyer.set_password('buyer123')
        
        db.session.add_all([self.admin, self.seller_verified, self.seller_unverified, self.buyer])
        db.session.commit()
        
        # Create seller profiles
        self.profile_verified = Seller(
            id=self.seller_verified.id,
            business_name='Apex Seller',
            is_kyc_verified=True,
            total_sales=500.0,
            order_count=2
        )
        
        self.profile_unverified = Seller(
            id=self.seller_unverified.id,
            business_name='Shady Seller',
            is_kyc_verified=False,
            total_sales=1200.0, # Exceeds our test threshold of 1000.0
            order_count=5
        )
        
        db.session.add_all([self.profile_verified, self.profile_unverified])
        
        # Create Category
        self.fashion = Category(name='Fashion')
        db.session.add(self.fashion)
        db.session.commit()
        
        # Create Products
        self.p_normal = Product(
            seller_id=self.seller_verified.id,
            name='Premium Shirt',
            description='Normal price shirt',
            price=1000.0,
            stock=10,
            category_id=self.fashion.id
        )
        
        self.p_cheap = Product(
            seller_id=self.seller_unverified.id,
            name='Cheap Replica Shirt',
            description='Suspiciously cheap shirt',
            price=50.0, # Highly anomalous: < 25% of 1000.0 (median category price)
            stock=5,
            category_id=self.fashion.id
        )
        
        db.session.add_all([self.p_normal, self.p_cheap])
        db.session.commit()

    def get_token(self, email, password):
        response = self.client.post('/api/auth/login', json={
            'email': email,
            'password': password
        })
        data = json.loads(response.data)
        return data.get('token')

    def test_auth_login_signup(self):
        # 1. Test invalid login
        response = self.client.post('/api/auth/login', json={
            'email': 'buyer@test.com',
            'password': 'wrongpassword'
        })
        self.assertEqual(response.status_code, 401)
        
        # 2. Test valid login
        token = self.get_token('buyer@test.com', 'buyer123')
        self.assertIsNotNone(token)
        
        # 3. Test get profile with token
        headers = {'Authorization': f'Bearer {token}'}
        response = self.client.get('/api/auth/profile', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['email'], 'buyer@test.com')

    def test_cart_operations(self):
        token = self.get_token('buyer@test.com', 'buyer123')
        headers = {'Authorization': f'Bearer {token}'}
        
        # 1. Add item to cart
        response = self.client.post('/api/cart', json={
            'product_id': self.p_normal.id,
            'quantity': 2
        }, headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['quantity'], 2)
        
        # 2. Fetch cart
        response = self.client.get('/api/cart', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['total'], 2000.0)

    def test_fraud_rules_price_anomaly(self):
        token = self.get_token('buyer@test.com', 'buyer123')
        headers = {'Authorization': f'Bearer {token}'}
        
        # Add anomalous cheap product to cart
        self.client.post('/api/cart', json={
            'product_id': self.p_cheap.id,
            'quantity': 1
        }, headers=headers)
        
        # Checkout: should trigger price anomaly flag & unverified seller volume flag
        response = self.client.post('/api/orders', json={
            'billing_address': '123 Test Street, Mumbai, MH',
            'delivery_address': '123 Test Street, Mumbai, MH',
            'payment_method': 'Card'
        }, headers=headers)
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        
        # Check if flagged
        self.assertTrue(data['fraud_checked']['is_flagged'])
        
        # Verify specific flags in response
        rules_triggered = [f['rule'] for f in data['fraud_checked']['flags']]
        self.assertIn('Price Anomaly', rules_triggered)
        self.assertIn('Unverified Seller Volume', rules_triggered)
        
        # Check database log
        logs = FraudLog.query.filter_by(order_id=data['order']['id']).all()
        self.assertEqual(len(logs), 2)

    def test_fraud_rules_velocity(self):
        token = self.get_token('buyer@test.com', 'buyer123')
        headers = {'Authorization': f'Bearer {token}'}
        
        # Place 1st order
        self.client.post('/api/cart', json={'product_id': self.p_normal.id, 'quantity': 1}, headers=headers)
        self.client.post('/api/orders', json={
            'billing_address': 'Test St, Mumbai', 'delivery_address': 'Test St, Mumbai', 'payment_method': 'Card'
        }, headers=headers)
        
        # Place 2nd order immediately (Limit is 2 orders/min in TestConfig)
        self.client.post('/api/cart', json={'product_id': self.p_normal.id, 'quantity': 1}, headers=headers)
        response = self.client.post('/api/orders', json={
            'billing_address': 'Test St, Mumbai', 'delivery_address': 'Test St, Mumbai', 'payment_method': 'Card'
        }, headers=headers)
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        
        # Should be flagged for velocity
        self.assertTrue(data['fraud_checked']['is_flagged'])
        rules_triggered = [f['rule'] for f in data['fraud_checked']['flags']]
        self.assertIn('Order Velocity', rules_triggered)

    def test_update_product(self):
        # 1. Test update by owner
        token_owner = self.get_token('seller1@test.com', 'seller123')
        headers_owner = {'Authorization': f'Bearer {token_owner}'}
        
        response = self.client.put(f'/api/products/{self.p_normal.id}', json={
            'name': 'Updated Premium Shirt',
            'price': 1200.0,
            'discount': 0,
            'stock': 15,
            'category_id': self.fashion.id,
            'description': 'New description',
            'images': ['http://img1.jpg', 'http://img2.jpg']
        }, headers=headers_owner)
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Updated Premium Shirt')
        self.assertEqual(data['price'], 1200.0)
        self.assertEqual(data['stock'], 15)
        self.assertEqual(len(data['images']), 2)
        
        # 2. Test update by non-owner seller
        token_other = self.get_token('seller2@test.com', 'seller123')
        headers_other = {'Authorization': f'Bearer {token_other}'}
        
        response = self.client.put(f'/api/products/{self.p_normal.id}', json={
            'name': 'Hacked Shirt',
            'price': 10.0,
            'discount': 0,
            'stock': 5,
            'category_id': self.fashion.id,
            'images': ['http://img1.jpg', 'http://img2.jpg']
        }, headers=headers_other)
        
        self.assertEqual(response.status_code, 403)
        
        # 3. Test update validation failure (missing fields)
        response = self.client.put(f'/api/products/{self.p_normal.id}', json={
            'price': 1200.0,
            'stock': 15
        }, headers=headers_owner)
        
        self.assertEqual(response.status_code, 400)

    def test_create_product_images_validation(self):
        token_seller = self.get_token('seller1@test.com', 'seller123')
        headers = {'Authorization': f'Bearer {token_seller}'}
        
        # 1. 0 images (should fail)
        response = self.client.post('/api/products', json={
            'name': 'New Saree',
            'price': 1500.0,
            'discount': 0,
            'stock': 10,
            'category_id': self.fashion.id,
            'images': []
        }, headers=headers)
        self.assertEqual(response.status_code, 400)

        # 1b. 1 image (should succeed)
        response = self.client.post('/api/products', json={
            'name': 'New Saree 1 Image',
            'price': 1500.0,
            'discount': 0,
            'stock': 10,
            'category_id': self.fashion.id,
            'images': ['http://saree1.jpg']
        }, headers=headers)
        self.assertEqual(response.status_code, 201)
        
        # 2. 9 images (should fail)
        nine_imgs = [f'http://img{i}.jpg' for i in range(9)]
        response = self.client.post('/api/products', json={
            'name': 'New Saree',
            'price': 1500.0,
            'discount': 0,
            'stock': 10,
            'category_id': self.fashion.id,
            'images': nine_imgs
        }, headers=headers)
        self.assertEqual(response.status_code, 400)
        
        # 3. 3 images (should succeed)
        response = self.client.post('/api/products', json={
            'name': 'New Saree',
            'price': 1500.0,
            'discount': 0,
            'stock': 10,
            'category_id': self.fashion.id,
            'images': ['http://saree1.jpg', 'http://saree2.jpg', 'http://saree3.jpg']
        }, headers=headers)
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(len(data['images']), 3)

    def test_new_product_rating(self):
        # A new product with no reviews should return a rating of 0.0
        product_dict = self.p_normal.to_dict()
        self.assertEqual(product_dict['rating'], 0.0)

    def test_order_return_deducts_earnings_and_no_double_count(self):
        # Check initial metrics
        seller = db.session.get(Seller, self.seller_verified.id)
        initial_sales = seller.total_sales
        initial_returns = seller.return_count
        
        # Create an order
        buyer_token = self.get_token('buyer@test.com', 'buyer123')
        headers = {'Authorization': f'Bearer {buyer_token}'}
        
        # Add to cart and checkout
        self.client.post('/api/cart', json={'product_id': self.p_normal.id, 'quantity': 1}, headers=headers)
        response = self.client.post('/api/orders', json={
            'billing_address': 'Test',
            'delivery_address': 'Test',
            'payment_method': 'Card'
        }, headers=headers)
        
        self.assertEqual(response.status_code, 201)
        order_data = json.loads(response.data)['order']
        order_id = order_data['id']
        
        # Verify seller total_sales increased
        db.session.refresh(seller)
        expected_sales_after_order = initial_sales + self.p_normal.price
        self.assertEqual(seller.total_sales, expected_sales_after_order)
        
        # Transition to Return_Requested
        # Buyer requests the return; seller accepts it later.
        seller_token = self.get_token('seller1@test.com', 'seller123')
        seller_headers = {'Authorization': f'Bearer {seller_token}'}
        response = self.client.put(f'/api/orders/{order_id}/status', json={'status': 'Return_Requested'}, headers=headers)
        self.assertEqual(response.status_code, 200)
        
        # Check returns count increased by 1
        db.session.refresh(seller)
        self.assertEqual(seller.return_count, initial_returns + 1)
        
        # Transition to Returned (return accepted)
        response = self.client.put(f'/api/orders/{order_id}/status', json={'status': 'Returned'}, headers=seller_headers)
        self.assertEqual(response.status_code, 200)
        
        # Check returns count is STILL initial_returns + 1 (no double counting)
        db.session.refresh(seller)
        self.assertEqual(seller.return_count, initial_returns + 1)
        
        # Verify that total sales decreased back to initial_sales (subtracted refunded item price)
        self.assertEqual(seller.total_sales, initial_sales)

    def test_buyer_seller_order_sequences(self):
        buyer_token = self.get_token('buyer@test.com', 'buyer123')
        headers = {'Authorization': f'Bearer {buyer_token}'}
        
        # 1. Place 1st order
        self.client.post('/api/cart', json={'product_id': self.p_normal.id, 'quantity': 1}, headers=headers)
        response1 = self.client.post('/api/orders', json={
            'billing_address': 'Addr1', 'delivery_address': 'Addr1', 'payment_method': 'Card'
        }, headers=headers)
        self.assertEqual(response1.status_code, 201)
        data1 = json.loads(response1.data)['order']
        self.assertEqual(data1['buyer_order_sequence'], 1)
        
        # 2. Place 2nd order
        self.client.post('/api/cart', json={'product_id': self.p_normal.id, 'quantity': 1}, headers=headers)
        response2 = self.client.post('/api/orders', json={
            'billing_address': 'Addr2', 'delivery_address': 'Addr2', 'payment_method': 'Card'
        }, headers=headers)
        self.assertEqual(response2.status_code, 201)
        data2 = json.loads(response2.data)['order']
        self.assertEqual(data2['buyer_order_sequence'], 2)
        
        # 3. Check seller's sequence counts
        seller_token = self.get_token('seller1@test.com', 'seller123')
        seller_headers = {'Authorization': f'Bearer {seller_token}'}
        response_seller = self.client.get('/api/seller/orders', headers=seller_headers)
        self.assertEqual(response_seller.status_code, 200)
        orders = json.loads(response_seller.data)
        
        # Orders are grouped by order ID. Since we made two distinct orders, seller should have two records.
        # Let's sort them by order ID to check sequence
        orders.sort(key=lambda x: x['id'])
        self.assertEqual(len(orders), 2)
        self.assertEqual(orders[0]['seller_order_sequence'], 1)
        self.assertEqual(orders[1]['seller_order_sequence'], 2)

    def test_delete_buyer_account(self):
        buyer_token = self.get_token('buyer@test.com', 'buyer123')
        headers = {'Authorization': f'Bearer {buyer_token}'}
        
        # 1. Add item to cart and place an order to create references
        self.client.post('/api/cart', json={'product_id': self.p_normal.id, 'quantity': 1}, headers=headers)
        order_res = self.client.post('/api/orders', json={
            'billing_address': 'Addr1', 'delivery_address': 'Addr1', 'payment_method': 'Card'
        }, headers=headers)
        self.assertEqual(order_res.status_code, 201)
        order_id = json.loads(order_res.data)['order']['id']
        
        # Verify order exists
        self.assertIsNotNone(db.session.get(Order, order_id))
        
        # 2. Delete the buyer account
        delete_res = self.client.delete('/api/auth/delete-account', json={'password': 'buyer123'}, headers=headers)
        self.assertEqual(delete_res.status_code, 200)
        
        # 3. Verify user is deleted
        user = User.query.filter_by(email='buyer@test.com').first()
        self.assertIsNone(user)
        
        # 4. Verify orders and order items are deleted
        self.assertIsNone(db.session.get(Order, order_id))
        self.assertEqual(OrderItem.query.filter_by(order_id=order_id).count(), 0)
        
        # 5. Verify cart items are deleted
        self.assertEqual(CartItem.query.filter_by(user_id=self.buyer.id).count(), 0)

    def test_delete_seller_account(self):
        seller_token = self.get_token('seller1@test.com', 'seller123')
        headers = {'Authorization': f'Bearer {seller_token}'}
        
        # Verify seller has products before deletion
        product_count = Product.query.filter_by(seller_id=self.seller_verified.id).count()
        self.assertTrue(product_count > 0)
        
        # Delete the seller account
        delete_res = self.client.delete('/api/auth/delete-account', json={'password': 'seller123'}, headers=headers)
        self.assertEqual(delete_res.status_code, 200)
        
        # Verify seller user and profile are deleted
        user = User.query.filter_by(email='seller1@test.com').first()
        self.assertIsNone(user)
        seller = db.session.get(Seller, self.seller_verified.id)
        self.assertIsNone(seller)
        
        # Verify seller products are deleted
        self.assertEqual(Product.query.filter_by(seller_id=self.seller_verified.id).count(), 0)

    def test_signup_password_complexity(self):
        from app.models import OTPRecord
        from datetime import datetime, timedelta
        import uuid
        
        email = 'newbuyer@test.com'
        phone = '+1234567890'
        token = str(uuid.uuid4())
        
        record = OTPRecord(
            email=email,
            phone=phone,
            email_otp='123456',
            phone_otp='654321',
            verification_token=token,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        db.session.add(record)
        db.session.commit()

        # 1. Test short password
        response = self.client.post('/api/auth/signup', json={
            'email': email,
            'password': 'Short1',
            'role': 'buyer',
            'phone': phone,
            'verification_token': token
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('at least 8 characters', json.loads(response.data)['message'])

        # 2. Test password without number
        response = self.client.post('/api/auth/signup', json={
            'email': email,
            'password': 'NoNumbersHere',
            'role': 'buyer',
            'phone': phone,
            'verification_token': token
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('at least one number', json.loads(response.data)['message'])

        # 3. Test password without uppercase letter
        response = self.client.post('/api/auth/signup', json={
            'email': email,
            'password': 'nouppercase123',
            'role': 'buyer',
            'phone': phone,
            'verification_token': token
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('at least one uppercase letter', json.loads(response.data)['message'])

        # 4. Test password without lowercase letter
        response = self.client.post('/api/auth/signup', json={
            'email': email,
            'password': 'NOLOWERCASE123',
            'role': 'buyer',
            'phone': phone,
            'verification_token': token
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('at least one lowercase letter', json.loads(response.data)['message'])

        # 5. Test valid password
        response = self.client.post('/api/auth/signup', json={
            'email': email,
            'password': 'ValidPassword123',
            'role': 'buyer',
            'phone': phone,
            'verification_token': token
        })
        self.assertEqual(response.status_code, 201)

if __name__ == '__main__':
    unittest.main()
