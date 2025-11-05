// /api/bayarcash.js
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    name,
    email,
    phone,
    amount,
    payment_channel, // 1=FPX, 6=DuitNow QR
    orderNumber, // Receive order number from frontend
  } = req.body;

  const portal_key = "779cd699e9e59a84c4581a68fd7e0130"; // your portal key
  const secretKey = "CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa"; // your API secret key (testing)
  const personalAccessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1IiwianRpIjoiZDM4MjI5ZTQ5NTllYzQ4Mjg5NDU1Yzg1ZmYyMzMwMTQxNTVlYzI4ZjA0MDIyZjc4YzVhOWFkNWZlZDIxZDBjNzYwYmIwYWI2MGY5YjM5ZDMiLCJpYXQiOjE3MjQxNDAwNDEuMDgwNTM1LCJuYmYiOjE3MjQxNDAwNDEuMDgwNTM3LCJleHAiOjIwMzk2NzI4NDEuMDc5OTAxLCJzdWIiOiI2Iiwic2NvcGVzIjpbIioiXX0.Kn6MXwi6d33aZQpnQqq_Ng7b6UeNlZiXIJ-Jth6PmUoRJBTmw4hdAlDQVSJRosHN4giUBm1lquflNnjqpwI9-bBv-ttqF79X3GjW2GMkYzAnvghGyEn5ldQwBQdmp8pjm7o4Pn1faMe81I5rehQLM8rJFnnQsArKzHl6ZHi7w4gMscIsP-ISWnTN7zO0nBNw6KA5ZpGhhPPhM8Zfrq4nmDWtne6-8h1VoFErPTaKu_GfDXma3PnfJaGwGtWJdJePB6wpR_FwrsB8zgByyOilgRTNZiTBHio4-c-T0V1UU48SDojmCEYNuD1iSdQC-MRaAKUaHdWy7kfmyOy7FohmBbqsag8F47UjDD97VoVOmfUYP6FeKGTMOBuqcOcgN42KXs0Pa6juWIHXtOqn6_WFU9oAhuELIRDX8qR_0-CEIQSJxeeKj8AWBcAvgM2iUeD15QTHJAC41EKpLpL31HboNvk4bJfol4vo3j1SBdHMLmZzI3iENBJtGEO-jNgovhzDkPkCu39u0PrA6-La7VqZ3a-6ItvRyVHcR4ud_zl2oHBl-ZggPB92XVV7yNGUOgHpbshptWbcSWR6XeHHkbNU2K9T8y9c62r-R9KzK07fvn0C3bgR7f8wwgBrZn7WR_dC6Rk_pjumCi8UvItFOgDa5TQXgUnZVBFMPZY3h8APQA0"; // your personal access token
  
  // Use the order number from frontend instead of generating a new one
  const order_number = orderNumber || "ORD-" + Date.now();
  
  // Generate return and callback URLs
  const origin = req.headers.origin || "https://prostreamfb.vercel.app";
  const return_url = `${origin}/payment-successful.html?status=success&order=${order_number}`;
  const callback_url = `${origin}/api/webhook`;

  // Prepare payload for checksum calculation
  const checksumPayload = {
    payment_channel,
    order_number,
    amount: amount.toString(), // Amount must be string for checksum
    payer_name: name,
    payer_email: email,
  };

  // Sort payload by key
  const sortedKeys = Object.keys(checksumPayload).sort();
  const payloadString = sortedKeys.map((k) => checksumPayload[k]).join("|");

  // Generate HMAC SHA256 checksum
  const checksum = crypto
    .createHmac("sha256", secretKey)
    .update(payloadString)
    .digest("hex");

  // Prepare full payload for API request
  const body = {
    payment_channel,
    portal_key,
    order_number,
    amount, // Amount should be number for API request
    payer_name: name,
    payer_email: email,
    payer_telephone_number: phone,
    return_url,
    callback_url,
    checksum,
  };

  try {
    const response = await fetch(
      "https://api.console.bayarcash-sandbox.com/v3/payment-intent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${personalAccessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Bayarcash API error:", data);
      return res.status(response.status).json({ 
        success: false, 
        error: data.message || "Failed to create payment intent" 
      });
    }
    
    // Return response in format expected by index.html
    return res.status(200).json({ 
      success: true, 
      paymentUrl: data.url,
      orderNumber: order_number
    });
  } catch (err) {
    console.error("Bayarcash API error:", err);
    return res.status(500).json({ 
      success: false, 
      error: "Error processing request" 
    });
  }
}
