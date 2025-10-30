from flask import Blueprint, request, jsonify
import razorpay
import os
from app import mongo

razorpay_bp = Blueprint('razorpay', __name__)

# Razorpay Client
razorpay_client = razorpay.Client(
    auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET")
    )
)

# -----------------------------
# Create Razorpay Order
# -----------------------------
@razorpay_bp.route('/create-order', methods=['POST'])
def create_razorpay_order():
    data = request.get_json() or {}
    amount = data.get('amount')  # In paise
    receipt = data.get('receipt')

    if not amount or not receipt:
        return jsonify({"error": "Amount and receipt required"}), 400

    order = razorpay_client.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": receipt,
        "payment_capture": 1
    })

    return jsonify(order)

# -----------------------------
# Verify Payment Signature
# -----------------------------
@razorpay_bp.route('/verify', methods=['POST'])
def verify_payment():
    data = request.get_json()
    order_number = data.get('order_number')
    payment_id = data.get('razorpay_payment_id')
    rzp_order_id = data.get('razorpay_order_id')
    signature = data.get('razorpay_signature')

    if not all([order_number, payment_id, rzp_order_id, signature]):
        return jsonify({'error': 'Missing payment verification data'}), 400

    try:
        # Verify Signature
        import hmac, hashlib
        generated_signature = hmac.new(
            os.getenv("RAZORPAY_KEY_SECRET").encode(),
            f"{rzp_order_id}|{payment_id}".encode(),
            hashlib.sha256
        ).hexdigest()

        if generated_signature != signature:
            return jsonify({"error": "Invalid signature"}), 400

        # Update DB
        mongo.db.orders.update_one(
            {"order_number": order_number},
            {"$set": {"status": "confirmed", "payment_status": "paid"}}
        )

        return jsonify({'success': True, 'message': 'Payment Verified Successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
