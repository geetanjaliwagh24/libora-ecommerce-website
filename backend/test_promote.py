import requests

# Login as seller
login = requests.post('http://localhost:5000/api/auth/login', json={
    'email': 'apex_seller@marketplace.com',
    'password': 'password123'
})
data = login.json()
token = data['token']
print(f"Login OK. Token: {token[:20]}...")

# Fetch seller products
products = requests.get('http://localhost:5000/api/seller/products', headers={
    'Authorization': f'Bearer {token}'
})
prods = products.json()
print(f"Products count: {len(prods)}")
for p in prods[:5]:
    print(f"  id={p['id']}, name={p['name'][:30]}, is_promoted={p.get('is_promoted', 'MISSING')}")

# Test promote on first non-promoted product
target = None
for p in prods:
    if not p.get('is_promoted', True):
        target = p
        break

if target:
    print(f"\nPromoting product id={target['id']} ({target['name']})...")
    res = requests.post(f"http://localhost:5000/api/seller/promote/{target['id']}", headers={
        'Authorization': f'Bearer {token}'
    })
    print(f"Response: {res.status_code} {res.json()}")
else:
    print("\nNo non-promoted products found to test.")
