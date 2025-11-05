const crypto = require('crypto');

// --- CONFIGURATION ---
const SANDBOX_URL = 'https://api.console.bayar.cash/v3';
const PERSONAL_ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI1IiwianRpIjoiY2VmZTAzMzkzMzU5NTVlYzFmNjhhNzU2N2UyMjZhN2Q5MWU4ODI4NTA5Y2I1OWJmYzIyYWY3ZDk5NDBkNzRkZDIzNDNlNjA3NDJlYzRmNzIiLCJpYXQiOjE3NjIzODIwNjYuMjYyOTU5LCJuYmYiOjE3NjIzODIwNjYuMjYyOTYxLCJleHAiOjIwNzc5MTQ4NjYuMjYyMDkxLCJzdWIiOiIzMjk0Iiwic2NvcGVzIjpbIioiXX0.Vd9gfEIl7BnI06eVuiIPSfQK2lt--ERdx_ydlrjIx0p4tUHiH4YWsPmGUlIzOc-_TNOHtIOUEmaMypy-VNxPbk28geDTk9f0m_WKqiYNuqRxQd9jZ0piWgoTd0p1CRF5hQhJ5WhzkkYK647uOLBg6UKIiekB1GI9-EUNJ7UKjtO0Ma_zbIyUlms-85ZrXjRei63jtNq_-zge9sQmWjN6ZotiPrduDfK9ZObbgfKi25vnAxX-Ado05Vnohn47w2DFiTgGIhK-aEBXembEY2v9IBZ4j2XidbsugWfcfyoak_TJjekhSc-4EsmMa2upgWneDSEEDIJWU10aZlt21f3pJG3IT1gi9DYVuGLbuUhGqQSnZLwZPmt0gLpLLgZ0AlGfVSITA98qrUKxvQBcFfS2u4QHtBKawBHUhBmoQPrD6Pfv0aNQ-cfaA_6hbIwim6WdYUBaCAwAawh43l5HBemAlxec0E4nTjX0Nmda5j5wDjgkzL8ec9jjdQEcdUjt5ZBeg9kKZryf6-37QMMYpnoBeYc4qnsTZIu5tEg-eW9HiTc5xbVD2AXrP-k0JPffV1AbF0b_oXpcxVgk3HWL-kRMWRYK-2Wf0Z1dwSIwnWSRJRBnkD_H-cEUI68fFDNcIwe52zYXMjPM2O1aQJSedqq0VF8lSnEsGKQ-gmACW-gbrx4';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { transactionId } = req.body;
        
        if (!transactionId) {
            return res.status(400).json({ success: false, error: 'Transaction ID is required' });
        }
        
        console.log('Checking transaction status for:', transactionId);
        
        const response = await fetch(`${SANDBOX_URL}/transactions/${transactionId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${PERSONAL_ACCESS_TOKEN}`,
            }
        });
        
        const data = await response.json();
        console.log('Transaction status response:', JSON.stringify(data, null, 2));
        
        if (response.ok) {
            res.status(200).json({ 
                success: true, 
                transaction: data
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Failed to check transaction status',
                details: data
            });
        }
        
    } catch (error) {
        console.error('Error checking transaction status:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};
