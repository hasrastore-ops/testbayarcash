const crypto = require('crypto');

// --- CONFIGURATION ---
const SANDBOX_URL = 'https://api.console.bayarcash-sandbox.com/v3';
const PORTAL_KEY = '779cd699e9e59a84c4581a68fd7e0130';
const PERSONAL_ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1IiwianRpIjoiZDM4MjI5ZTQ5NTllYzQ4Mjg5NDU1Yzg1ZmYyMzMwMTQxNTVlYzI4ZjA0MDIyZjc4YzVhOWFkNWZlZDIxZDBjNzYwYmIwYWI2MGY5YjM5ZDMiLCJpYXQiOjE3MjQxNDAwNDEuMDgwNTM1LCJuYmYiOjE3MjQxNDAwNDEuMDgwNTM3LCJleHAiOjIwMzk2NzI4NDEuMDc5OTAxLCJzdWIiOiI2Iiwic2NvcGVzIjpbIioiXX0.Kn6MXwi6d33aZQpnQqq_Ng7b6UeNlZiXIJ-Jth6PmUoRJBTmw4hdAlDQVSJRosHN4giUBm1lquflNnjqpwI9-bBv-ttqF79X3GjW2GMkYzAnvghGyEn5ldQwBQdmp8pjm7o4Pn1faMe81I5rehQLM8rJFnnQsArKzHl6ZHi7w4gMscIsP-ISWnTN7zO0nBNw6KA5ZpGhhPPhM8Zfrq4nmDWtne6-8h1VoFErPTaKu_GfDXma3PnfJaGwGtWJdJePB6wpR_FwrsB8zgByyOilgRTNZiTBHio4-c-T0V1UU48SDojmCEYNuD1iSdQC-MRaAKUaHdWy7kfmyOy7FohmBbqsag8F47UjDD97VoVOmfUYP6FeKGTMOBuqcOcgN42KXs0Pa6juWIHXtOqn6_WFU9oAhuELIRDX8qR_0-CEIQSJxeeKj8AWBcAvgM2iUeD15QTHJAC41EKpLpL31HboNvk4bJfol4vo3j1SBdHMLmZzI3iENBJtGEO-jNgovhzDkPkCu39u0PrA6-La7VqZ3a-6ItvRyVHcR4ud_zl2oHBl-ZggPB92XVV7yNGUOgHpbshptWbcSWR6XeHHkbNU2K9T8y9c62r-R9KzK07fvn0C3bgR7f8wwgBrZn7WR_dC6Rk_pjumCi8UvItFOgDa5TQXgUnZVBFMPZY3h8APQA0';
const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';

// --- HELPER FUNCTION TO GENERATE CHECKSUM ---
function generateChecksum(payload, secretKey) {
    // Trim all values
    const trimmedPayload = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, String(value).trim()])
    );

    // Sort by key
    const sortedKeys = Object.keys(trimmedPayload).sort();

    // Implode with '|'
    const stringToSign = sortedKeys.map(key => trimmedPayload[key]).join('|');

    // Generate HMAC SHA256 hash
    return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

// --- API ENDPOINT ---
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, amount } = req.body;
        const orderNumber = `ORD-${Date.now()}`;
        const returnUrl = `${req.headers.origin}/?status=success&order=${orderNumber}`;
        const callbackUrl = `${req.headers.origin}/api/webhook`;

        // *** FIX IS HERE ***
        // 1. Create the FULL payload to send to the API
        const fullPayload = {
            payment_channel: 1,
            portal_key: PORTAL_KEY,
            order_number: orderNumber,
            amount: amount * 100, // Amount is in cents
            payer_name: name,
            payer_email: email,
            payer_telephone_number: phone,
            return_url: returnUrl,
            callback_url: callbackUrl,
        };

        // 2. Create a SEPARATE payload for checksum generation based on the PHP sample
        const checksumPayload = {
            payment_channel: 1,
            order_number: orderNumber,
            amount: (amount * 100).toString(), // Ensure it's a string like "1050"
            payer_name: name,
            payer_email: email,
        };

        // 3. Generate the checksum using the smaller payload
        const checksum = generateChecksum(checksumPayload, API_SECRET_KEY);

        // 4. Add the generated checksum to the FULL payload
        fullPayload.checksum = checksum;

        // 5. Make the API call with the full, signed payload
        const apiResponse = await fetch(`${SANDBOX_URL}/payment-intents`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`,
            },
            body: JSON.stringify(fullPayload),
        });

        const data = await apiResponse.json();

        if (data.url) {
            res.status(200).json({ success: true, paymentUrl: data.url });
        } else {
            // Log the error from Bayarcash for better debugging
            console.error('Bayarcash API Error:', data);
            res.status(400).json({ success: false, error: data.message || 'Failed to create payment intent.' });
        }

    } catch (error) {
        console.error('Error in create-payment:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
