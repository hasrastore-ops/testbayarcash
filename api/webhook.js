const crypto = require('crypto');
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
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const webhookBody = req.body;
        console.log('Webhook received:', webhookBody);

        const receivedChecksum = webhookBody.checksum;
        if (!receivedChecksum) {
            console.error('Webhook received without checksum.');
            return res.status(403).send('Forbidden');
        }

        const { checksum, ...payloadForValidation } = webhookBody;
        const expectedChecksum = generateChecksum(payloadForValidation, API_SECRET_KEY);

        if (receivedChecksum !== expectedChecksum) {
            console.error('Invalid webhook checksum. Potential fraud!');
            return res.status(403).send('Forbidden');
        }

        const { order_number, status } = webhookBody;
        console.log(`Payment for Order ${order_number} has status: ${status}`);

        res.status(200).send('Webhook received successfully');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
