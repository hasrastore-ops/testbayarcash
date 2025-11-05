const crypto = require('crypto');

const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';

// Google Apps Script URL (using your provided URL)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyy6dwCOBf7etABb36fiIIU56jpPWomc5YQCMfZ9iyCzV7gy5AuCG06ayfm_3odcsr/exec';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const webhookBody = req.body;
        console.log('Webhook received:', webhookBody);

        // 1. Verify the checksum
        const receivedChecksum = webhookBody.checksum;
        if (!receivedChecksum) {
            console.error('Webhook received without checksum.');
            return res.status(403).send('Forbidden');
        }

        const stringToSign = `${API_SECRET_KEY}${webhookBody.order_number || ''}${webhookBody.status || ''}${webhookBody.transaction_id || ''}${webhookBody.amount || ''}${webhookBody.currency || ''}`;
        const expectedChecksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

        if (receivedChecksum !== expectedChecksum) {
            console.error('Invalid webhook checksum. Potential fraud!');
            return res.status(403).send('Forbidden');
        }

        // 2. Forward the webhook to Google Apps Script
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(webhookBody)
            });
            
            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Google Apps Script processed webhook successfully');
            } else {
                console.error('❌ Google Apps Script Error:', result.error);
            }
        } catch (error) {
            console.error('❌ Error calling Google Apps Script:', error);
        }

        // 3. Respond to Bayarcash immediately (don't wait for Google Apps Script)
        res.status(200).send('Webhook received successfully');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
