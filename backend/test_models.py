import json
import urllib.request
import urllib.parse

data = urllib.parse.urlencode({"username": "admin@sifsentinel.com", "password": "Sentinel2026!"}).encode()
req = urllib.request.Request("http://localhost:8000/api/v1/auth/login", data=data)
try:
    with urllib.request.urlopen(req) as response:
        token = json.loads(response.read())['access_token']
        
    req2 = urllib.request.Request("http://localhost:8000/api/v1/models", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req2) as res2:
        print(res2.read().decode())
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'read'):
        print(e.read().decode())
