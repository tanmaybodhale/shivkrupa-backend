/**
 * ORDER NOTIFIER — Node.js backend integration (Vercel-safe version)
 * --------------------------------------------------------------------
 * This version reads your Firebase secret key and device token from
 * environment variables instead of a file — safe to commit to a
 * PUBLIC GitHub repo, because the actual secrets live only in Vercel's
 * dashboard, never in your code.
 *
 * Call sendOrderNotification(order) right after a new order is saved.
 */

const admin = require('firebase-admin');

// Reads the full service account JSON from an environment variable
// (set in Vercel dashboard — see setup steps)
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Your phone's device token, also set in Vercel dashboard
const DEVICE_TOKEN = process.env.ORDER_NOTIFIER_DEVICE_TOKEN;

/**
 * Call this function right after a new order is created.
 * @param {{id: string|number, customerName?: string, total?: string|number}} order
 */
async function sendOrderNotification(order) {
  if (!DEVICE_TOKEN) {
    console.error('ORDER_NOTIFIER_DEVICE_TOKEN is not set — skipping notification.');
    return;
  }

  const message = {
    token: DEVICE_TOKEN,
    data: {
      title: 'New Order Received! 🛒',
      body: `Order #${order.id} from ${order.customerName || 'a customer'} — ₹${order.total || ''}`,
    },
    android: {
      priority: 'high',
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('Order notification sent:', response);
  } catch (err) {
    console.error('Failed to send order notification:', err);
  }
}

module.exports = { sendOrderNotification };
