const crypto = require('crypto');

const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';

// Google Apps Script URL (using your provided URL)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyy6dwCOBf7etABb36fiIIU56jpPWomc5YQCMfZ9iyCzV7gy5AuCG06ayfm_3odcsr/exec';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        console.error('Webhook: Method not allowed');
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const webhookBody = req.body;
        console.log('Webhook received:', JSON.stringify(webhookBody, null, 2));

        // Verify this is a transaction callback
        if (webhookBody.record_type !== 'transaction') {
            console.error('Webhook: Not a transaction record');
            return res.status(400).send('Invalid record type');
        }

        // Verify the checksum
        const receivedChecksum = webhookBody.checksum;
        if (!receivedChecksum) {
            console.error('Webhook: No checksum provided');
            return res.status(403).send('Forbidden');
        }

        // Create string to sign based on BayarCash documentation
        const stringToSign = `${API_SECRET_KEY}${webhookBody.transaction_id || ''}${webhookBody.order_number || ''}${webhookBody.amount || ''}${webhookBody.currency || ''}${webhookBody.status || ''}`;
        const expectedChecksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

        console.log('Checksum verification:');
        console.log('- String to sign:', stringToSign);
        console.log('- Received:', receivedChecksum);
        console.log('- Expected:', expectedChecksum);
        console.log('- Match:', receivedChecksum === expectedChecksum);

        if (receivedChecksum !== expectedChecksum) {
            console.error('Webhook: Invalid checksum');
            return res.status(403).send('Forbidden');
        }

        // Process the transaction based on status
        const { transaction_id, order_number, status, status_description } = webhookBody;
        console.log(`Transaction ${transaction_id} for Order ${order_number} has status: ${status} (${status_description})`);

        // Status 3 = Success (from documentation)
        if (status === 3) {
            console.log('Processing successful payment...');
            
            try {
                // Forward to Google Apps Script
                const enhancedPayload = {
                    ...webhookBody,
                    action: 'processPayment',
                    order_number: order_number,
                    transaction_id: transaction_id,
                    status: 'success', // Convert to string for consistency
                    amount: webhookBody.amount,
                    currency: webhookBody.currency
                };
                
                console.log('Sending to Google Apps Script:', JSON.stringify(enhancedPayload, null, 2));
                
                const response = await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(enhancedPayload)
                });
                
                const result = await response.json();
                console.log('Google Apps Script response:', JSON.stringify(result, null, 2));
                
                if (result.success) {
                    console.log('✅ Google Apps Script processed webhook successfully');
                } else {
                    console.error('❌ Google Apps Script Error:', result.error);
                }
            } catch (error) {
                console.error('❌ Error calling Google Apps Script:', error);
            }
        } else {
            console.log(`Payment not successful (status: ${status} - ${status_description}), skipping processing`);
        }

        // IMPORTANT: Return 200 status code immediately
        console.log('Sending 200 response to BayarCash');
        res.status(200).send('Webhook received successfully');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
