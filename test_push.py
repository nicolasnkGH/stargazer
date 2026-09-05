import os
import sys
import json
import unittest
import asyncio

# Ensure api directory is in python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

# Load .env if present, otherwise set mock environment variables for CI runners
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

if not os.environ.get("VAPID_PUBLIC_KEY"):
    os.environ["VAPID_PUBLIC_KEY"] = "BAuM8jUpQd3Wor8Z6p_XRaQZyqxuxSBHPH3J1w8TzY63SEFrJhvS2A1044sOodNa27bJ9260Dn_nLMoeMk4FULo"
if not os.environ.get("VAPID_PRIVATE_KEY"):
    os.environ["VAPID_PRIVATE_KEY"] = "-----BEGIN EC PRIVATE KEY-----\\nMHcCAQEEIGj0JG3I397oSgFXyd7Ahh/xmP1pMFW/Ei+7AKSd56C3oAoGCCqGSM49\\nAwEHoUQDQgAEC4zyNSlB3daivxnqn9dFpBnKrG7FIEc8fcnXDxPNjrdIQWsmG9LY\\nDXTjiw6h01rbtsn3brQOf+csyh4yTgVQug==\\n-----END EC PRIVATE KEY-----"
if not os.environ.get("VAPID_ADMIN_EMAIL"):
    os.environ["VAPID_ADMIN_EMAIL"] = "admin@stargazer.nick-t.net"

from engine.push import (
    save_subscription,
    get_all_subscriptions,
    delete_subscription,
    send_notification,
    broadcast_notification,
    PUSH_AVAILABLE,
    VAPID_PUBLIC_KEY,
    VAPID_OBJ,
)
from main import get_vapid_key, push_subscribe, push_test, PushSubscriptionRequest
from fastapi.responses import JSONResponse


def parse_response(res):
    if isinstance(res, JSONResponse):
        return res.status_code, json.loads(res.body.decode())
    return 200, res


class TestPushNotifications(unittest.TestCase):
    def test_vapid_initialization(self):
        self.assertTrue(PUSH_AVAILABLE, "PUSH_AVAILABLE should be True when VAPID keys are present")
        self.assertIsNotNone(VAPID_OBJ, "VAPID_OBJ should be successfully instantiated")
        self.assertTrue(len(VAPID_PUBLIC_KEY) > 0, "VAPID_PUBLIC_KEY should not be empty")

    def test_vapid_endpoint(self):
        status, data = parse_response(get_vapid_key())
        self.assertEqual(status, 200)
        self.assertIn("publicKey", data)
        self.assertEqual(data["publicKey"], VAPID_PUBLIC_KEY)

    def test_subscription_flow(self):
        fake_sub = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test-endpoint-unit-test",
            "expirationTime": None,
            "keys": {
                "p256dh": "BIP491gN301S",
                "auth": "testauth"
            }
        }
        sub_req = PushSubscriptionRequest(**fake_sub)
        status, data = parse_response(asyncio.run(push_subscribe(sub_req)))
        self.assertEqual(status, 200)
        self.assertEqual(data, {"status": "subscribed"})

        subs = get_all_subscriptions()
        endpoints = [s.get("endpoint") for s in subs]
        self.assertIn(fake_sub["endpoint"], endpoints)

        delete_subscription(fake_sub["endpoint"])

    def test_test_push_endpoint(self):
        status, data = parse_response(asyncio.run(push_test()))
        self.assertEqual(status, 200)
        self.assertIn("sent", data)
        self.assertIn("failed", data)


if __name__ == "__main__":
    unittest.main()
