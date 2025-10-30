from flask import Blueprint, request, jsonify
import razorpay
import os

router = Blueprint("razorpay_payments", __name__)

client = razorpay.Client(
    auth=(
        os.getenv("RAZORPAY_KEY_ID"),
        os.getenv("RAZORPAY_KEY_SECRET")
    )
)

@router.post("/create-order")
def create_order():
    data = request.get_json()
    amount = data.get("amount")   # amount in paise
    currency = data.get("currency", "INR")
    receipt = data.get("receipt", "order_rcpt")

    try:
        order = client.order.create({
            "amount": amount,
            "currency": currency,
            "receipt": receipt,
        })
        return jsonify(order)
    except Exception as e:
        return jsonify({"error": str(e)}), 400
