// api/bayarcash.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = process.env.BAYARCASH_TOKEN;
  const url = "https://api.console.bayarcash-sandbox.com/v3/payment-intents";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payment_channel: req.body.payment_channel,
        amount: req.body.amount,
        payer_name: req.body.payer_name,
        payer_email: req.body.payer_email,
        return_url: "https://your-vercel-site.vercel.app/payment-success.html"
      }),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Server error", error: error.toString() });
  }
}
