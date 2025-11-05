const crypto = require('crypto');

// --- CONFIGURATION ---
const SANDBOX_URL = 'https://api.console.bayarcash-sandbox.com/v3';
const PORTAL_KEY = '779cd699e9e59a84c4581a68fd7e0130';
const PERSONAL_ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1IiwianRpIjoiZDM4MjI5ZTQ5NTllYzQ4Mjg5NDU1Yzg1ZmYyMzMwMTQxNTVlYzI4ZjA0MDIyZjc4YzVhOWFkNWZlZDIxZDBjNzYwYmIwYWI2MGY5YjM5ZDMiLCJpYXQiOjE3MjQxNDAwNDEuMDgwNTM1LCJuYmYiOjE3MjQxNDAwNDEuMDgwNTM3LCJleHAiOjIwMzk2NzI4NDEuMDc5OTAxLCJzdWIiOiI2Iiwic2NvcGVzIjpbIioiXX0.Kn6MXwi6d33aZQpnQqq_Ng7b6UeNlZiXIJ-Jth6PmUoRJBTmw4hdAlDQVSJRosHN4giUBm1lquflNnjqpwI9-bBv-ttqF79X3GjW2GMkYzAnvghGyEn5ldQwBQdmp8pjm7o4Pn1faMe81I5rehQLM8rJFnnQsArKzHl6ZHi7w4gMscIsP-ISWnTN7zO0nBNw6KA5ZpGhhPPhM8Zfrq4nmDWtne6-8h1VoFErPTaKu_GfDXma3PnfJaGwGtWJdJePB6wpR_FwrsB8zgByyOilgRTNZiTBHio4-c-T0V1UU48SDojmCEYNuD1iSdQC-MRaAKUaHdWy7kfmyOy7FohmBbqsag8F47UjDD97VoVOmfUYP6FeKGTMOBuqcOcgN42KXs0Pa6juWIHXtOqn6_WFU9oahuELIRDX8qR_0-CEIQSJxeeKj8AWBcAvgM2iUeD15QTHJAC41EKpLpL31HboNvk4bJfol4vo3j1SBdHMLmZzI3iENBJtGEO-jNgovhzDkPkCu39u0PrA6-La7VqZ3a-6ItvRyVHcR4ud_zl2oHBl-ZggPB92XVV7yNGUOgHpbshptWbcSWR6XeHHkbNU2K9T8y9c62r-R9KzK07fvn0C3bgR7f8wwgBrZn7WR_dC6Rk_pjumCi8UvItFOgDa5TQXgUnZVBFMPZY3h8APQA0';
const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';

function generateChecksum(payload, secretKey) {
    const trimmedPayload = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, String(value).trim()])
    );
    const sortedKeys = Object.keys(trimmedPayload).sort();
    const stringToSign = sortedKeys.map(key => trimmedPayload[key]).join('|');
    return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, amount, paymentChannel } = req.body;
        
        // Generate order number
        const orderNumber = `ORD-${Date.now()}`;
        
        // Set return and callback URLs
        const returnUrl = `${req.headers.origin}/?status=success&order=${orderNumber}`;
        const callbackUrl = `${req.headers.origin}/api/webhook`;

        // Prepare payload for BayarCash API
        const fullPayload = {
            payment_channel: paymentChannel,
            portal_key: PORTAL_KEY,
            order_number: orderNumber,
            amount: amount,
            payer_name: name,
            payer_email: email,
            payer_telephone_number: phone,
            return_url: returnUrl,
            callback_url: callbackUrl,
        };

        // Prepare payload for checksum calculation
        const checksumPayload = {
            payment_channel: paymentChannel,
            order_number: orderNumber,
            amount: amount.toString(),
            payer_name: name,
            payer_email: email,
        };

        // Generate checksum
        const checksum = generateChecksum(checksumPayload, API_SECRET_KEY);
        fullPayload.checksum = checksum;

        // Make API request to BayarCash
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
            // Return success response with payment URL and order number
            res.status(200).json({ 
                success: true, 
                paymentUrl: data.url,
                orderNumber: orderNumber
            });
        } else {
            console.error('Bayarcash API Error:', data);
            res.status(400).json({ 
                success: false, 
                error: data.message || 'Failed to create payment intent.' 
            });
        }

    } catch (error) {
        console.error('Error in bayarcash API:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal Server Error' 
        });
    }
};
