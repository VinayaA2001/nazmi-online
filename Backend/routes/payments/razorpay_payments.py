import os
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
import razorpay

bp_razorpay = Blueprint("razorpay_payments", __name__)

# Load from .env
RZP_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RZP_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# Razorpay Client
rzp = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET))


def db():
    """ Helper to access DB without circular import """
    from app import db as _db
    return _db


# ------------------------------------------------------
# ✅ 1. CREATE RAZORPAY ORDER (Secure) 
# ------------------------------------------------------
@bp_razorpay.post("/api/payments/razorpay/create-order")
def create_rzp_order():
    data = request.get_json() or {}
    order_id = data.get("order_id")         # MongoDB order _id
    order_number = data.get("order_number") # Legacy order number

    if not order_id and not order_number:
        return jsonify({"error": "order_id or order_number required"}), 400

    # Fetch order from DB
    order = None
    if order_id:
        order = db().orders.find_one({"_id": ObjectId(order_id)})
    else:
        order = db().orders.find_one({"order_number": order_number})

    if not order:
        return jsonify({"error": "Order not found"}), 404

    if order.get("payment_status") == "paid":
        return jsonify({"error": "Order already paid"}), 400

    amount = float(order.get("grand_total", 0)) * 100  # Convert to paise

    try:
        rzp_order = rzp.order.create({
            "amount": int(amount),
            "currency": "INR",
            "receipt": order["order_number"],
            "notes": {
                "order_id": str(order["_id"]),
                "order_number": order["order_number"],
                "customer": order.get("customer_name", "")
            },
            "payment_capture": 1
        })

        return jsonify({
            "success": True,
            "razorpay_order_id": rzp_order["id"],
            "amount": rzp_order["amount"],
            "currency": rzp_order["currency"],
            "key": RZP_KEY_ID  # public key for frontend
        })

    except Exception as e:
        current_app.logger.error(f"Razorpay order create error: {e}")
        return jsonify({"error": "Failed to create Razorpay order"}), 500


# ------------------------------------------------------
# ✅ 2. VERIFY PAYMENT (Most Secure - Backend Fetches Details)
# ------------------------------------------------------
@bp_razorpay.post("/api/payments/razorpay/verify")
def verify_rzp_payment():
    data = request.get_json() or {}
    payment_id = data.get("payment_id")
    rzp_order_id = data.get("razorpay_order_id")

    if not payment_id or not rzp_order_id:
        return jsonify({"error": "payment_id & razorpay_order_id required"}), 400

    # Fetch payment details directly from Razorpay
    try:
        payment = rzp.payment.fetch(payment_id)
    except Exception:
        return jsonify({"error": "Invalid payment ID"}), 400

    # Check status
    if payment.get("status") != "captured":
        return jsonify({"error": "Payment not captured"}), 400

    # Verify order match
    notes = payment.get("notes", {})
    order_id = notes.get("order_id")
    order_number = notes.get("order_number")

    order = None
    if order_id:
        order = db().orders.find_one({"_id": ObjectId(order_id)})
    elif order_number:
        order = db().orders.find_one({"order_number": order_number})

    if not order:
        return jsonify({"error": "Order not found in DB"}), 404

    # Mark order paid
    db().orders.update_one(
        {"_id": order["_id"]},
        {"$set": {
            "payment_status": "paid",
            "status": "confirmed",
            "paid_at": datetime.now(datetime.UTC)

        }}
    )

    # Save payment log
    try:
        payments_dir = os.path.join("instance", "payments")
        os.makedirs(payments_dir, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = f"payment_{payment_id}_{ts}.json"
        with open(os.path.join(payments_dir, fname), "w", encoding="utf-8") as f:
            json.dump(payment, f, indent=2, default=str)
    except Exception:
        pass

    return jsonify({
        "success": True,
        "message": "Payment verified & order marked as paid",
        "order_id": str(order["_id"]),
        "order_number": order["order_number"],
        "amount": payment.get("amount") / 100,
        "method": payment.get("method")
    })


# ------------------------------------------------------
# 📌 3. GET RAZORPAY ORDER DETAILS
# ------------------------------------------------------
@bp_razorpay.get("/api/payments/razorpay/order/<rzp_order_id>")
def get_rzp_order_details(rzp_order_id):
    try:
        order = rzp.order.fetch(rzp_order_id)
        return jsonify(order)
    except Exception:
        return jsonify({"error": "Invalid Razorpay Order ID"}), 400


# ------------------------------------------------------
# 📌 4. GET RAZORPAY PAYMENT DETAILS
# ------------------------------------------------------
@bp_razorpay.get("/api/payments/razorpay/payment/<payment_id>")
def get_rzp_payment_details(payment_id):
    try:
        payment = rzp.payment.fetch(payment_id)
        return jsonify(payment)
    except Exception:
        return jsonify({"error": "Invalid Payment ID"}), 400
