import os
import sys
import unittest
import asyncio

# Ensure api directory is in python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "api"))

# Load .env
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

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


class TestPushNotifications(unittest.TestCase):
    def test_vapid_initialization(self):
        self.assertTrue(PUSH_AVAILABLE, "PUSH_AVAILABLE should be True when VAPID keys are present in .env")
        self.assertIsNotNone(VAPID_OBJ, "VAPID_OBJ should be successfully instantiated")
        self.assertTrue(len(VAPID_PUBLIC_KEY) > 0, "VAPID_PUBLIC_KEY should not be empty")

    def test_vapid_endpoint(self):
        res = get_vapid_key()
        self.assertIsInstance(res, dict)
        self.assertIn("publicKey", res)
        self.assertEqual(res["publicKey"], VAPID_PUBLIC_KEY)

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
        res = asyncio.run(push_subscribe(sub_req))
        self.assertEqual(res, {"status": "subscribed"})

        subs = get_all_subscriptions()
        endpoints = [s.get("endpoint") for s in subs]
        self.assertIn(fake_sub["endpoint"], endpoints)

        delete_subscription(fake_sub["endpoint"])

    def test_test_push_endpoint(self):
        res = asyncio.run(push_test())
        self.assertIsInstance(res, dict)
        self.assertIn("sent", res)
        self.assertIn("failed", res)


if __name__ == "__main__":
    unittest.main()
