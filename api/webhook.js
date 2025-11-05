const crypto = require('crypto');

// --- CONFIGURATION ---
const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1426639056716038247/fByGT9VoydmqwdJNV0W9knEQxatRfJpTVJr2UrgtUTIwxRNY9LpeFmzlkplI9OZWIDue';

// Function to send Discord notification
async function sendDiscordNotification(orderData, status = 'success') {
    try {
        const timestamp = new Date().toISOString();
        
        // Create embed for Discord message
        const embed = {
            title: status === 'success' ? "✅ PEMBAYARAN BERJAYA - PROSTREAM" : "❌ PEMBAYARAN GAGAL - PROSTREAM",
            description: status === 'success' ? "Pelanggan telah berjaya membuat pembayaran!" : "Pembayaran pelanggan telah gagal.",
            color: status === 'success' ? 0x43b581 : 0xF94144, // Green for success, Red for failed
            fields: [
                {
                    name: "📋 Status Pembayaran",
                    value: status === 'success' ? "Berjaya" : "Gagal",
                    inline: true
                },
                {
                    name: "🔢 No. Pesanan",
                    value: orderData.order_number || "N/A",
                    inline: true
                },
                {
                    name: "👤 Nama",
                    value: orderData.payer_name || "N/A",
                    inline: true
                },
                {
                    name: "📱 No Telefon",
                    value: orderData.payer_telephone_number || "N/A",
                    inline: true
                },
                {
                    name: "📧 Email",
                    value: orderData.payer_email || "N/A",
                    inline: false
                },
                {
                    name: "💰 Jumlah",
                    value: orderData.amount ? `RM ${orderData.amount}` : "N/A",
                    inline: true
                },
                {
                    name: "🕐 Tarikh & Masa",
                    value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
                    inline: false
                }
            ],
            footer: {
                text: "PROSTREAM - Streaming Apps Package",
                icon_url: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png"
            },
            timestamp: timestamp
        };

        const payload = {
            username: "PROSTREAM Bot",
            avatar_url: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
            embeds: [embed]
        };

        const response = await fetch(DISCORD_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log('Discord notification sent successfully');
            return true;
        } else {
            const errorText = await response.text();
            console.error('Failed to send Discord notification:', errorText);
            return false;
        }
    } catch (error) {
        console.error('Error sending Discord notification:', error);
        return false;
    }
}

// --- WEBHOOK ENDPOINT ---
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

        // Construct the string to sign based on the webhook formula
        const stringToSign = `${API_SECRET_KEY}${webhookBody.order_number || ''}${webhookBody.status || ''}${webhookBody.transaction_id || ''}${webhookBody.amount || ''}${webhookBody.currency || ''}`;
        
        const expectedChecksum = crypto.createHash('sha256').update(stringToSign).digest('hex');

        if (receivedChecksum !== expectedChecksum) {
            console.error('Invalid webhook checksum. Potential fraud!');
            console.log(`Received: ${receivedChecksum}`);
            console.log(`Expected: ${expectedChecksum}`);
            return res.status(403).send('Forbidden');
        }

        // 2. Process the webhook
        const { order_number, status, transaction_id, amount, currency } = webhookBody;
        console.log(`Payment for Order ${order_number} has status: ${status}`);

        // 3. Send Discord notification based on payment status
        if (status === 'success') {
            await sendDiscordNotification(webhookBody, 'success');
        } else {
            await sendDiscordNotification(webhookBody, 'failed');
        }

        // 4. In a real application, you would update your database here
        // Example: 
        // await db.orders.updateOne(
        //     { order_number: order_number }, 
        //     { 
        //         $set: { 
        //             status: status,
        //             transaction_id: transaction_id,
        //             paid_amount: amount,
        //             currency: currency,
        //             updated_at: new Date()
        //         }
        //     }
        // );

        // 5. Respond to Bayarcash to acknowledge receipt
        res.status(200).send('Webhook received successfully');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
