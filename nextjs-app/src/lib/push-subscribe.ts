function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}

export async function subscribeToPush(): Promise<void> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Push notifications are not supported in this browser.");
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const keyRes = await fetch("/api/push/vapid-key");
  if (!keyRes.ok) throw new Error("VAPID key unavailable — push isn't configured on the server.");
  const { publicKey } = (await keyRes.json()) as { publicKey: string };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const subRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),
  });
  if (!subRes.ok) throw new Error("Failed to save subscription on the server.");
}

export async function sendTestPush(): Promise<{ sent: number; failed: number; total: number }> {
  const res = await fetch("/api/push/test", { method: "POST" });
  if (!res.ok) throw new Error("Test push failed — push is not configured on the server.");
  const data = (await res.json()) as { sent: number; failed: number; total: number };
  if (data.total === 0) {
    throw new Error("No active subscriptions found. Please click 'Enable Notifications' first!");
  }
  return data;
}
