from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from datetime import datetime
import os
import json
import requests
from config import Config

app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db = SQLAlchemy(app)

# Database Models
class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text)
    image_url = db.Column(db.String(200))
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(100), nullable=False)
    first_name = db.Column(db.String(100))
    last_name = db.Column(db.String(100))
    total = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, confirmed, declined
    payment_method = db.Column(db.String(50))
    payment_proof = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    items = db.relationship('OrderItem', backref='order', lazy=True)

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    price = db.Column(db.Float, nullable=False)
    product = db.relationship('Product', backref='order_items')

# Create tables
with app.app_context():
    db.create_all()
    
    # Add sample products if none exist
    if Product.query.count() == 0:
        sample_products = [
            Product(name="Premium Coffee", price=15.99, category="Beverages", 
                   description="High-quality arabica coffee beans", 
                   image_url="https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=300"),
            Product(name="Wireless Headphones", price=89.99, category="Electronics", 
                   description="Noise-cancelling wireless headphones", 
                   image_url="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300"),
            Product(name="Organic Tea", price=12.50, category="Beverages", 
                   description="Premium organic green tea", 
                   image_url="https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300"),
            Product(name="Smart Watch", price=199.99, category="Electronics", 
                   description="Fitness tracking smart watch", 
                   image_url="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300")
        ]
        for product in sample_products:
            db.session.add(product)
        db.session.commit()

# Routes
@app.route('/')
def index():
    products = Product.query.filter_by(active=True).all()
    categories = db.session.query(Product.category).distinct().all()
    categories = [cat[0] for cat in categories]
    return render_template('index.html', products=products, categories=categories)

@app.route('/admin')
def admin():
    # Simple admin check (in production, use proper authentication)
    products = Product.query.all()
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return render_template('admin.html', products=products, orders=orders)

@app.route('/checkout')
def checkout():
    return render_template('checkout.html', kbz_pay=Config.KBZ_PAY_NUMBER)

# API Routes
@app.route('/api/products')
def api_products():
    category = request.args.get('category')
    if category:
        products = Product.query.filter_by(category=category, active=True).all()
    else:
        products = Product.query.filter_by(active=True).all()
    
    return jsonify([{
        'id': p.id,
        'name': p.name,
        'price': p.price,
        'category': p.category,
        'description': p.description,
        'image_url': p.image_url
    } for p in products])

@app.route('/api/add_product', methods=['POST'])
def add_product():
    data = request.json
    product = Product(
        name=data['name'],
        price=float(data['price']),
        category=data['category'],
        description=data.get('description', ''),
        image_url=data.get('image_url', '')
    )
    db.session.add(product)
    db.session.commit()
    return jsonify({'success': True, 'id': product.id})

@app.route('/api/update_product/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    product = Product.query.get_or_404(product_id)
    data = request.json
    
    product.name = data.get('name', product.name)
    product.price = float(data.get('price', product.price))
    product.category = data.get('category', product.category)
    product.description = data.get('description', product.description)
    product.image_url = data.get('image_url', product.image_url)
    product.active = data.get('active', product.active)
    
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/delete_product/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    product = Product.query.get_or_404(product_id)
    product.active = False
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/create_order', methods=['POST'])
def create_order():
    data = request.json
    
    # Create order
    order = Order(
        user_id=data['user_id'],
        username=data['username'],
        first_name=data.get('first_name', ''),
        last_name=data.get('last_name', ''),
        total=float(data['total']),
        payment_method=data['payment_method']
    )
    db.session.add(order)
    db.session.flush()  # Get order ID
    
    # Add order items
    for item in data['items']:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item['product_id'],
            quantity=item['quantity'],
            price=float(item['price'])
        )
        db.session.add(order_item)
    
    db.session.commit()
    return jsonify({'success': True, 'order_id': order.id})

@app.route('/api/upload_payment_proof', methods=['POST'])
def upload_payment_proof():
    if 'payment_proof' not in request.files:
        return jsonify({'success': False, 'error': 'No file uploaded'})
    
    file = request.files['payment_proof']
    order_id = request.form.get('order_id')
    
    if file.filename == '' or not order_id:
        return jsonify({'success': False, 'error': 'Invalid file or order ID'})
    
    # Create upload directory if it doesn't exist
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Save file
    filename = secure_filename(f"payment_{order_id}_{file.filename}")
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Update order
    order = Order.query.get(order_id)
    if order:
        order.payment_proof = filename
        db.session.commit()
        return jsonify({'success': True})
    
    return jsonify({'success': False, 'error': 'Order not found'})

@app.route('/api/update_order_status', methods=['POST'])
def update_order_status():
    data = request.json
    order = Order.query.get(data['order_id'])
    if order:
        order.status = data['status']
        db.session.commit()
        
        # Send notification to user via Telegram (optional)
        send_order_notification(order)
        
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Order not found'})

def send_order_notification(order):
    """Send order status notification to user via Telegram"""
    try:
        bot_token = app.config['BOT_TOKEN']
        if bot_token and bot_token != 'YOUR_BOT_TOKEN_HERE':
            message = f"Order #{order.id} has been {order.status}!"
            url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            data = {
                'chat_id': order.user_id,
                'text': message
            }
            requests.post(url, data=data)
    except Exception as e:
        print(f"Failed to send notification: {e}")

@app.route('/webhook', methods=['POST'])
def webhook():
    """Telegram webhook endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    # Find an available port
    import socket
    sock = socket.socket()
    sock.bind(('', 0))
    port = sock.getsockname()[1]
    sock.close()
    
    print(f"Starting Flask app on port {port}")
    app.run(debug=True, host='0.0.0.0', port=port)