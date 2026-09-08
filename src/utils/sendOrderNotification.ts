import admin from 'firebase-admin';

// Reads your Firebase secret key from Render's environment variables
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Comma-separated list of every staff phone's device token, e.g.
// "AAAA...,BBBB...,CCCC..."  (set this in Render's Environment tab)
const DEVICE_TOKENS = (process.env.ORDER_NOTIFIER_DEVICE_TOKENS || '')
  .split(',')
  .map((t) => t.trim())
  .filter((t) => t.length > 0);

export async function sendOrderNotification(order: any): Promise<void> {
  if (DEVICE_TOKENS.length === 0) {
    console.error('No device tokens set in ORDER_NOTIFIER_DEVICE_TOKENS — skipping notification.');
    return;
  }

  const message = {
    tokens: DEVICE_TOKENS,
    data: {
      title: 'New Order Received! 🛒',
      body: `Order #${order.orderId} from ${order.name || 'a customer'} — ₹${order.total || ''}`,
    },
    android: {
      priority: 'high' as const,
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`Notifications sent: ${response.successCount} succeeded, ${response.failureCount} failed`);

    // Log which specific tokens failed and why (helpful if a phone was
    // reinstalled and its old token is now invalid/expired)
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        console.error(`Failed for token ${DEVICE_TOKENS[idx]}:`, resp.error?.message);
      }
    });
  } catch (err) {
    console.error('Failed to send order notifications:', err);
  }
}
