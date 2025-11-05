const crypto = require('crypto');

// --- CONFIGURATION ---
const SANDBOX_URL = 'https://api.console.bayar.cash/v3';
const PORTAL_KEY = 'f80299bba8e9ebc761210712fd9cb4cb';
const PERSONAL_ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1IiwianRpIjoiY2VmZTAzMzkzMzU5NTVlYzFmNjhhNzU2N2UyMjZhN2Q5MWU4ODI4NTA5Y2I1OWJmYzIyYWY3ZDk5NDBkNzRkZDIzNDNlNjA3NDJlYzRmNzIiLCJpYXQiOjE3NjIzODIwNjYuMjYyOTU5LCJuYmYiOjE3NjIzODIwNjYuMjYyOTYxLCJleHAiOjIwNzc5MTQ4NjYuMjYyMDkxLCJzdWIiOiIzMjk0Iiwic2NvcGVzIjpbIioiXX0.Vd9gfEIl7BnI06eVuiIPSfQK2lt--ERdx_ydlrjIx0p4tUHiH4YWsPmGUlIzOc-_TNOHtIOUEmaMypy-VNxPbk28geDTk9f0m_WKqiYNuqRxQd9jZ0piWgoTd0p1CRF5hQhJ5WhzkkYK647uOLBg6UKIiekB1GI9-EUNJ7UKjtO0Ma_zbIyUlms-85ZrXjRei63jtNq_-zge9sQmWjN6ZotiPrduDfK9ZObbgfKi25vnAxX-Ado05Vnohn47w2DFiTgGIhK-aEBXembEY2v9IBZ4j2XidbsugWfcfyoak_TJjekhSc-4EsmMa2upgWneDSEEDIJWU10aZlt21f3pJG3IT1gi9DYVuGLbuUhGqQSnZLwZPmt0gLpLLgZ0AlGfVSITA98qrUKxvQBcFfS2u4QHtBKawBHUhBmoQPrD6Pfv0aNQ-cfaA_6hbIwim6WdYUBaCAwAawh43l5HBemAlxec0E4nTjX0Nmda5j5wDjgkzL8ec9jjdQEcdUjt5ZBeg9kKZryf6-37QMMYpnoBeYc4qnsTZIu5tEg-eW9HiTc5xbVD2AXrP-k0JPffV1AbF0b_oXpcxVgk3HWL-kRMWRYK-2Wf0Z1dwSIwnWSRJRBnkD_H-cEUI68fFDNcIwe52zYXMjPM2O1aQJSedqq0VF8lSnEsGKQ-gmACW-gbrx4';
const API_SECRET_KEY = 'yQlVIsj93a3KpL5ovDaQw2TYoUZj4qli';

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
