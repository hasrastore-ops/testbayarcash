// /api/bayarcash.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    payer_name,
    payer_email,
    amount,
    payment_channel, // 1=QR, 2=FPX
  } = req.body;

  const portal_key = "779cd699e9e59a84c4581a68fd7e0130"; // your portal key
  const secretKey = "CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa"; // your API secret key (testing)
  const order_number = "ORD-" + Date.now();

  // Prepare payload same as PHP
  const payloadData = {
    payment_channel,
    order_number,
    amount,
    payer_name,
    payer_email,
  };

  // Sort payload by key
  const sortedKeys = Object.keys(payloadData).sort();
  const payloadString = sortedKeys.map((k) => payloadData[k]).join("|");

  // Generate HMAC SHA256 checksum
  const checksum = crypto
    .createHmac("sha256", secretKey)
    .update(payloadString)
    .digest("hex");

  // Add portal key and checksum to body
  const body = {
    portal_key,
    ...payloadData,
    checksum,
  };

  try {
    const response = await fetch(
      "https://api.console.bayarcash-sandbox.com/v3/payment-intent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Bayarcash API error:", err);
    return res.status(500).json({ error: "Error processing request" });
  }
}
