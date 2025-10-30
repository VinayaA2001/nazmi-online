# payments.py (excerpt)
import os
import razorpay
from flask import Blueprint, request, jsonify

bp_pay = Blueprint("payments", __name__)

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")
rzp = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

@bp_pay.post("/api/payments/create-order")
def create_order():
  data = request.get_json() or {}
  amount = int(data.get("amount", 0))  # in paise
  currency = data.get("currency", "INR")
  receipt = data.get("receipt", f"NB-{int(__import__('time').time())}")
  notes = data.get("notes", {})

  # TODO: create your internal order record first; get internal_order_id
  internal_order_id = "NBINT-" + receipt

  order = rzp.order.create(dict(amount=amount, currency=currency, receipt=receipt, notes=notes, payment_capture=1))
  return jsonify({
    "order_id": order["id"],
    "amount": order["amount"],
    "internal_order_id": internal_order_id
  })

@bp_pay.post("/api/payments/verify")
def verify():
  data = request.get_json() or {}
  payment_id = data.get("razorpay_payment_id")
  order_id = data.get("razorpay_order_id")
  signature = data.get("razorpay_signature")

  params_dict = {
    'razorpay_order_id': order_id,
    'razorpay_payment_id': payment_id,
    'razorpay_signature': signature
  }
  try:
    razorpay.utility.verify_payment_signature(params_dict)
    # TODO: mark your internal order as paid
    return jsonify({"status": "ok"})
  except Exception as e:
    return jsonify({"status": "error", "message": str(e)}), 400
