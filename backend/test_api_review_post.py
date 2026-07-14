import urllib.request
import json

# Fetch token for buyer
url_login = "http://localhost:5000/api/auth/login"
req_data = json.dumps({
    "email": "buyer@marketplace.com",
    "password": "buyer123"
}).encode()

req = urllib.request.Request(url_login, data=req_data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as res:
        login_res = json.loads(res.read().decode())
        token = login_res.get('token')
        print("Logged in. Token retrieved.")
except Exception as e:
    print("Login failed:", e)
    token = None

if token:
    # Post review with base64 images and video
    url_review = "http://localhost:5000/api/reviews"
    review_payload = json.dumps({
        "product_id": 19,
        "rating": 5,
        "comment": "Testing real base64 upload",
        "images": ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="],
        "video_url": "data:video/mp4;base64,AAAAFmZ0eXBtcDQyAAAAAG1wNDJpc29tAAAAKHV1aWR4c210IGRhdGEAAAAQAAAAAGV4aWYAAAA="
    }).encode()
    
    req_review = urllib.request.Request(
        url_review,
        data=review_payload,
        headers={
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {token}'
        }
    )
    
    try:
        with urllib.request.urlopen(req_review) as res:
            review_res = json.loads(res.read().decode())
            print("Successfully posted review via API!")
            print(json.dumps(review_res, indent=2))
    except Exception as e:
        print("Failed to post review:", e)
