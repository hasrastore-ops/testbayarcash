// Google Apps Script URL (using your provided URL)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzyy6dwCOBf7etABb36fiIIU56jpPWomc5YQCMfZ9iyCzV7gy5AuCG06ayfm_3odcsr/exec';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { orderNumber } = req.body;
        
        if (!orderNumber) {
            return res.status(400).json({ success: false, error: 'Order number is required' });
        }
        
        console.log('Sending email for order:', orderNumber);
        
        // Call Google Apps Script to find the order and send email
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'sendEmail',
                orderNumber: orderNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            res.status(200).json({ 
                success: true, 
                message: 'Email sent successfully'
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: result.error || 'Failed to send email'
            });
        }
        
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
