const crypto = require('crypto');

const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';

// --- WEBHOOK ENDPOINT ---
module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const webhookBody = req.body;
        console.log('Webhook received:', webhookBody);

        // 1. CRITICAL: Verify the checksum using the correct formula
        const receivedChecksum = webhookBody.checksum;
        if (!receivedChecksum) {
            console.error('Webhook received without checksum.');
            return res.status(403).send('Forbidden');
        }

        // Construct the string to sign based on the specific webhook formula
        const stringToSign = `${API_SECRET_KEY}${webhookBody.order_number || ''}${webhookBody.status || ''}${webhookBody.transaction_id || ''}${webhookBody.amount || ''}${webhookBody.currency || ''}`;
        
        const expectedChecksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

        if (receivedChecksum !== expectedChecksum) {
            console.error('Invalid webhook checksum. Potential fraud!');
            console.log(`Received: ${receivedChecksum}`);
            console.log(`Expected: ${expectedChecksum}`);
            return res.status(403).send('Forbidden');
        }

        // 2. Process the webhook
        const { order_number, status } = webhookBody;
        console.log(`Payment for Order ${order_number} has status: ${status}`);

        // In a real app, you would update your database here.
        // e.g., await db.orders.updateOne({ order_number }, { $set: { status } });

        // 3. Respond to Bayarcash to acknowledge receipt
        res.status(200).send('Webhook received successfully');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
