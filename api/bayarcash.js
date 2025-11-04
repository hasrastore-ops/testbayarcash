// api/bayarcash.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = process.env.BAYARCASH_TOKEN;
  const url = "https://api.console.bayarcash-sandbox.com/v3/payment-intents";

  try {
    const orderId = "TEST-" + Date.now(); // generate order number unik

    const payload = {
      payment_channel: req.body.payment_channel,
      portal_key: "779cd699e9e59a84c4581a68fd7e0130",
      order_number: orderId,
      amount: req.body.amount,
      payer_name: req.body.payer_name,
      payer_email: req.body.payer_email,
      payer_telephone_number: "0123456789",
      payer_bank_code: "",
      payer_bank_name: "",
      metadata: "sandbox-test",
      return_url: "https://your-vercel-site.vercel.app/payment-success.html",
      platform_id: "",
      checksum: ""
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error", error: error.toString() });
  }
}
