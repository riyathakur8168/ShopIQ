import urllib.request, json

req = urllib.request.Request('http://127.0.0.1:5000/api/auth/login', 
                             data=json.dumps({'email': 'admin@shopiq.com', 'password': 'password123'}).encode('utf-8'), 
                             headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        token = data['access_token']
        print("Login successful.")
        
        req2 = urllib.request.Request('http://127.0.0.1:5000/api/sales/analytics', 
                                      headers={'Authorization': 'Bearer ' + token})
        with urllib.request.urlopen(req2) as res2:
            print("Analytics response:", res2.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    print("Response body:", e.read().decode())
except Exception as e:
    print('Error:', e)

