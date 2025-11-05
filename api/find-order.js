const crypto = require('crypto');

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
        
        // Call Google Apps Script to find the order
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                action: 'findOrder',
                orderNumber: orderNumber
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            res.status(200).json({ 
                success: true, 
                orderData: result.orderData
            });
        } else {
            res.status(404).json({ 
                success: false, 
                error: result.error || 'Order not found' 
            });
        }
        
    } catch (error) {
        console.error('Error finding order:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
