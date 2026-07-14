import urllib.request
import json

try:
    url = "http://localhost:5000/api/reviews/product/19"
    with urllib.request.urlopen(url) as res:
        data = json.loads(res.read().decode())
        print("API Response for Product 19 Reviews:")
        print(json.dumps(data, indent=2))
except Exception as e:
    print("Failed to fetch reviews:", e)
