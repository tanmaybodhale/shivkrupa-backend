import admin from 'firebase-admin';

// Reads your Firebase secret key from Render's environment variables
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const DEVICE_TOKEN = process.env.ORDER_NOTIFIER_DEVICE_TOKEN || '';

export async function sendOrderNotification(order: any): Promise<void> {
  if (!DEVICE_TOKEN) {
    console.error('ORDER_NOTIFIER_DEVICE_TOKEN is not set — skipping notification.');
    return;
  }

  const message = {
    token: DEVICE_TOKEN,
    data: {
      title: 'New Order Received! 🛒',
      body: `Order #${order.orderId} from ${order.name || 'a customer'} — ₹${order.total || ''}`,
    },
    android: {
      priority: 'high' as const,
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Order notification sent:', response);
  } catch (err) {
    console.error('Failed to send order notification:', err);
  }
}
