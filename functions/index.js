const functions = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

// ===============================
// 💳 PAYPAL CONFIG
// ===============================
const PAYPAL_CLIENT_ID = "YOUR_PAYPAL_CLIENT_ID";
const PAYPAL_SECRET = "YOUR_PAYPAL_SECRET";

// ===============================
// 💳 CREATE PAYPAL ORDER
// ===============================
exports.createOrder = functions.https.onRequest((req, res) => {
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
                value: req.body.amount || "10.00",
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      res.json(orderRes.data);
    } catch (err) {
      console.error(err);
      res.status(500).send("Error creating order");
    }
  });
});

// ===============================
// 📦 SAVE ORDER
// ===============================
exports.saveOrder = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId, amount } = req.body;

      const order = await db.collection("orders").add({
        userId,
        amount,
        status: "pending",
        createdAt: new Date(),
      });

      res.json({ id: order.id });
    } catch (err) {
      res.status(500).send(err);
    }
  });
});

// ===============================
// 🔗 CREATE REFERRAL CODE
// ===============================
exports.createReferral = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { userId } = req.body;

      const code = userId.slice(0, 5) + Math.floor(Math.random() * 10000);

      await db.collection("referrals").doc(code).set({
        userId,
        earnings: 0,
        createdAt: new Date(),
      });

      res.json({ code });
    } catch (err) {
      res.status(500).send(err);
    }
  });
});

// ===============================
// 💰 APPLY REFERRAL
// ===============================
exports.applyReferral = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { code } = req.body;

      const ref = await db.collection("referrals").doc(code).get();

      if (!ref.exists) {
        return res.status(404).send("Invalid code");
      }

      await db.collection("referrals").doc(code).update({
        earnings: admin.firestore.FieldValue.increment(1),
      });

      res.send("Referral applied");
    } catch (err) {
      res.status(500).send(err);
    }
  });
});
