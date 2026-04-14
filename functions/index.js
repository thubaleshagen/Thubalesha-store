const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// 🔐 PayPal Sandbox Credentials (replace later)
const PAYPAL_CLIENT_ID = "YOUR_PAYPAL_CLIENT_ID";
const PAYPAL_SECRET = "YOUR_PAYPAL_SECRET";

// ===============================
// 💳 CREATE PAYPAL ORDER
// ===============================
exports.createPayPalOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const auth = Buffer.from(
        PAYPAL_CLIENT_ID + ":" + PAYPAL_SECRET
      ).toString("base64");

      const tokenRes = await axios.post(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken = tokenRes.data.access_token;

      const orderRes = await axios.post(
        "https://api-m.sandbox.paypal.com/v2/checkout/orders",
        {
          intent: "CAPTURE",
          purchase_units: [
            {
              amount: {
                currency_code: "USD",
                value: "10.00",
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      res.json(orderRes.data);
    } catch (error) {
      console.error(error);
      res.status(500).send("PayPal error");
    }
  });
});

// ===============================
// 💳 CAPTURE PAYPAL PAYMENT
// ===============================
exports.capturePayPalOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { orderID } = req.body;

      const auth = Buffer.from(
        PAYPAL_CLIENT_ID + ":" + PAYPAL_SECRET
      ).toString("base64");

      const tokenRes = await axios.post(
        "https://api-m.sandbox.paypal.com/v1/oauth2/token",
        "grant_type=client_credentials",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken = tokenRes.data.access_token;

      const captureRes = await axios.post(
        `https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderID}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      res.json(captureRes.data);
    } catch (error) {
      console.error(error);
      res.status(500).send("Capture error");
    }
  });
});
