import sys, io
sys.path.append('d:/Projects/ShopIQ/backend')
from app import app
from extensions import db
app.config['TESTING'] = True
client = app.test_client()
data = {'file': (io.BytesIO(b'product_id,quantity,unit_price,sale_date,note\n1,2,10.0,2023-01-01,test\n'), 'test.csv')}
response = client.post('/api/sales/upload', data=data, content_type='multipart/form-data')
print('STATUS:', response.status_code)
print('JSON:', response.json)
