const crypto = require('crypto');

// --- CONFIGURATION ---
const SANDBOX_URL = 'https://api.console.bayarcash-sandbox.com/v3';
const PORTAL_KEY = '779cd699e9e59a84c4581a68fd7e0130';
const PERSONAL_ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1IiwianRpIjoiZDM4MjI5ZTQ5NTllYzQ4Mjg5NDU1Yzg1ZmYyMzMwMTQxNTVlYzI4ZjA0MDIyZjc4YzVhOWFkNWZlZDIxZDBjNzYwYmIwYWI2MGY5YjM5ZDMiLCJpYXQiOjE3MjQxNDAwNDEuMDgwNTM1LCJuYmYiOjE3MjQxNDAwNDEuMDgwNTM3LCJleHAiOjIwMzk2NzI4NDEuMDc5OTAxLCJzdWIiOiI2Iiwic2NvcGVzIjpbIioiXX0.Kn6MXwi6d33aZQpnQqq_Ng7b6UeNlZiXIJ-Jth6PmUoRJBTmw4hdAlDQVSJRosHN4giUBm1lquflNnjqpwI9-bBv-ttqF79X3GjW2GMkYzAnvghGyEn5ldQwBQdmp8pjm7o4Pn1faMe81I5rehQLM8rJFnnQsArKzHl6ZHi7w4gMscIsP-ISWnTN7zO0nBNw6KA5ZpGhhPPhM8Zfrq4nmDWtne6-8h1VoFErPTaKu_GfDXma3PnfJaGwGtWJdJePB6wpR_FwrsB8zgByyOilgRTNZiTBHio4-c-T0V1UU48SDojmCEYNuD1iSdQC-MRaAKUaHdWy7kfmyOy7FohmBbqsag8F47UjDD97VoVOmfUYP6FeKGTMOBuqcOcgN42KXs0Pa6juWIHXtOqn6_WFU9oAhuELIRDX8qR_0-CEIQSJxeeKj8AWBcAvgM2iUeD15QTHJAC41EKpLpL31HboNvk4bJfol4vo3j1SBdHMLmZzI3iENBJtGEO-jNgovhzDkPkCu39u0PrA6-La7VqZ3a-6ItvRyVHcR4ud_zl2oHBl-ZggPB92XVV7yNGUOgHpbshptWbcSWR6XeHHkbNU2K9T8y9c62r-R9KzK07fvn0C3bgR7f8wwgBrZn7WR_dC6Rk_pjumCi8UvItFOgDa5TQXgUnZVBFMPZY3h8APQA0';
const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';

// Google Apps Script URL (using your provided URL)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyy6dwCOBf7etABb36fiIIU56jpPWomc5YQCMfZ9iyCzV7gy5AuCG06ayfm_3odcsr/exec';

function generateChecksum(payload, secretKey) {
    const trimmedPayload = Object.fromEntries(
        Object.entries(payload).map(([key, value]) => [key, String(value).trim()])
    );
    const sortedKeys = Object.keys(trimmedPayload).sort();
    const stringToSign = sortedKeys.map(key => trimmedPayload[key]).join('|');
    return crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
}

// Function to save order to Google Sheets and wait for confirmation
async function saveOrderToGoogleSheets(orderData) {
    try {
        console.log('Saving order to Google Sheets:', orderData);
        
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'saveOrder',
                orderData: orderData
            })
        });
        
        const result = await response.json();
        console.log('Order save result:', result);
        
        if (result.success) {
            console.log('✅ Order saved to Google Sheets');
            return { success: true, message: result.message };
        } else {
            console.error('❌ Failed to save order to Google Sheets:', result.error);
            return { success: false, error: result.error };
        }
    } catch (error) {
        console.error('❌ Error saving order to Google Sheets:', error);
        return { success: false, error: error.message };
    }
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { name, email, phone, amount, payment_channel, orderNumber } = req.body;
        
        // Use the order number from the frontend instead of generating a new one
        if (!orderNumber) {
            return res.status(400).json({ success: false, error: 'Order number is required' });
        }
        
        // First, save the order to Google Sheets and wait for confirmation
        const orderData = {
            orderNumber: orderNumber, // Use the frontend order number
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            product: 'PROSTREAM 4 App Power Package',
            amount: amount,
            orderDate: new Date().toISOString()
        };
        
        console.log('Step 1: Saving order to Google Sheets...');
        const saveResult = await saveOrderToGoogleSheets(orderData);
        
        if (!saveResult.success) {
            console.error('❌ Failed to save order to Google Sheets. Aborting payment process.');
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to save order. Please try again later.',
                details: saveResult.error
            });
        }
        
        console.log('✅ Order successfully saved to Google Sheets. Proceeding with payment...');
        
        // Only proceed with payment if order was successfully saved
        const returnUrl = `${req.headers.origin}/payment-successful.html?status=success&order=${orderNumber}`;
        const callbackUrl = `${req.headers.origin}/api/webhook`;

        const fullPayload = {
            payment_channel: payment_channel,
            portal_key: PORTAL_KEY,
            order_number: orderNumber, // Use the frontend order number
            amount: amount,
            payer_name: name,
            payer_email: email,
            payer_telephone_number: phone,
            return_url: returnUrl,
            callback_url: callbackUrl,
        };

        const checksumPayload = {
            payment_channel: payment_channel,
            order_number: orderNumber, // Use the frontend order number
            amount: amount.toString(),
            payer_name: name,
            payer_email: email,
        };

        const checksum = generateChecksum(checksumPayload, API_SECRET_KEY);
        fullPayload.checksum = checksum;

        console.log('Step 2: Creating payment intent with BayarCash...');
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
            console.log('✅ Payment intent created successfully');
            res.status(200).json({ 
                success: true, 
                paymentUrl: data.url,
                orderNumber: orderNumber // Return the same order number
            });
        } else {
            console.error('❌ Bayarcash API Error:', data);
            res.status(400).json({ success: false, error: data.message || 'Failed to create payment intent.' });
        }

    } catch (error) {
        console.error('Error in create-payment:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
