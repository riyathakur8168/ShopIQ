from app import create_app
from extensions import db
from models import Sale

app = create_app()
with app.app_context():
    try:
        sales = Sale.query.order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        print("Success, found", len(sales), "sales")
    except Exception as e:
        print("ERROR:", str(e))



