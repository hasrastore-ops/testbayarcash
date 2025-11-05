const crypto = require('crypto');

const API_SECRET_KEY = 'CBFSkTgiaIcro1lZLyaiD8zyFNaa2Fsa';
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1426639056716038247/fByGT9VoydmqwdJNV0W9knEQxatRfJpTVJr2UrgtUTIwxRNY9LpeFmzlkplI9OZWIDue';

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

        // *** FIX IS HERE ***
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
        const { order_number, status, transaction_id, amount, currency } = webhookBody;
        console.log(`Payment for Order ${order_number} has status: ${status}`);

        // NEW: Send Discord notification for successful payment
        if (status === 'success') {
            try {
                // Create embed for Discord message
                const embed = {
                    title: "✅ PEMBAYARAN BERJAYA - PROSTREAM-FB",
                    description: "Pelanggan telah berjaya membuat pembayaran!",
                    color: 0x43b581, // Green for success
                    fields: [
                        {
                            name: "📋 Status Pembayaran",
                            value: "Berjaya",
                            inline: true
                        },
                        {
                            name: "🔢 No. Pesanan",
                            value: order_number,
                            inline: true
                        },
                        {
                            name: "💰 Jumlah",
                            value: `${currency} ${amount}`,
                            inline: true
                        },
                        {
                            name: "🔗 ID Transaksi",
                            value: transaction_id,
                            inline: false
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
                    timestamp: new Date().toISOString()
                };

                const payload = {
                    username: "PROSTREAM Bot",
                    avatar_url: "https://cdn-icons-png.flaticon.com/512/2991/2991148.png",
                    embeds: [embed]
                };

                await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });
                
                console.log('Discord notification sent successfully');
            } catch (discordError) {
                console.error('Failed to send Discord notification:', discordError);
                // Continue processing even if Discord notification fails
            }
        }

        // NEW: Store payment status in a database or file system
        // In a real app, you would update your database here.
        // e.g., await db.orders.updateOne({ order_number }, { $set: { status, transaction_id, amount, currency } });
        
        // For now, we'll just log it
        console.log(`Payment status updated for order ${order_number}: ${status}`);

        // 3. Respond to Bayarcash to acknowledge receipt
        res.status(200).send('Webhook received successfully');

    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal Server Error');
    }
};
