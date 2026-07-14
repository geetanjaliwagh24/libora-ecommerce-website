import requests
res = requests.get('http://127.0.0.1:5000/api/products')
products = res.json()
for p in products:
    print(f"{p['id']} - {p['name']}: {p.get('sizes')}")
