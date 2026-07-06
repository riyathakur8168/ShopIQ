import requests

res = requests.post('http://127.0.0.1:5000/api/auth/login', json={'email':'admin@shopiq.com', 'password':'password'})
if res.status_code != 200:
    print("Login failed", res.text)
    res = requests.post('http://127.0.0.1:5000/api/auth/signup', json={'name':'Admin','email':'admin@shopiq.com','password':'password'})
    res = requests.post('http://127.0.0.1:5000/api/auth/login', json={'email':'admin@shopiq.com', 'password':'password'})

tok = res.json().get('access_token')

res2 = requests.post('http://127.0.0.1:5000/api/sales/', json={'product_id': 1, 'quantity': 1, 'unit_price': 100, 'note': ''}, headers={'Authorization': 'Bearer ' + str(tok)})
print("STATUS:", res2.status_code)
print("BODY:", res2.text)


