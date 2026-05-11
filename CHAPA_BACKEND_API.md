# Chapa Payment Backend API Documentation

## Overview
This document outlines the required backend API endpoints for integrating Chapa payment processing with the Shegye Baltna frontend.

## Required Backend Endpoints

### 1. Initialize Payment
**POST** `/api/chapa/initialize`

Initializes a payment transaction with Chapa and returns the checkout URL.

#### Request Body
```json
{
  "email": "customer@example.com",
  "phone": "+251912345678",
  "amount": 158.50,
  "currency": "ETB",
  "payment_method": "telebirr",
  "transaction_ref": "SHEGYE170312345678901234",
  "shipping": {
    "full_name": "John Doe",
    "email": "customer@example.com", 
    "address": "Addis Ababa, Ethiopia"
  },
  "items": [
    {
      "name": "Berbere",
      "quantity": 2,
      "price": 158,
      "total": 316
    }
  ],
  "callback_url": "https://yourdomain.com/payment-callback.html",
  "return_url": "https://yourdomain.com/payment-success.html",
  "customization": {
    "title": "Shegye Baltna Order",
    "description": "Payment for 2 items"
  }
}
```

#### Response
```json
{
  "success": true,
  "checkout_url": "https://checkout.chapa.co/pay/SHEGYE170312345678901234",
  "tx_ref": "SHEGYE170312345678901234"
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Payment initialization failed",
  "error": "Invalid payment method"
}
```

### 2. Verify Payment
**POST** `/api/chapa/verify`

Verifies the status of a payment transaction.

#### Request Body
```json
{
  "tx_ref": "SHEGYE170312345678901234"
}
```

#### Response (Success)
```json
{
  "success": true,
  "status": "success",
  "transaction": {
    "tx_ref": "SHEGYE170312345678901234",
    "amount": 158.50,
    "currency": "ETB",
    "payment_method": "telebirr",
    "status": "success",
    "created_at": "2024-01-01T12:00:00Z",
    "verified_at": "2024-01-01T12:05:00Z"
  }
}
```

#### Response (Failed)
```json
{
  "success": false,
  "status": "failed",
  "message": "Payment was not successful"
}
```

## Chapa Integration Requirements

### 1. Chapa API Key
You'll need to sign up for a Chapa account and get your API key:
- Register at [https://chapa.co](https://chapa.co)
- Get your secret key from the dashboard
- Store it securely in environment variables

### 2. Environment Variables
```bash
CHAPA_SECRET_KEY=your_secret_key_here
CHAPA_WEBHOOK_SECRET=your_webhook_secret_here
BASE_URL=https://yourdomain.com
```

### 3. Supported Payment Methods
The frontend supports the following payment methods:
- `telebirr` - Telebirr Mobile Wallet
- `cbe-birr` - Commercial Bank of Ethiopia Mobile
- `dashen` - Dashen Bank
- `awash` - Awash Bank  
- `boa` - Bank of Africa
- `zemen` - Zemen Bank

## Node.js Implementation Example

### Installation
```bash
npm install express cors dotenv axios
```

### Basic Server Setup
```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_BASE_URL = 'https://api.chapa.co/v1';

// Initialize Payment Endpoint
app.post('/api/chapa/initialize', async (req, res) => {
  try {
    const {
      email,
      phone,
      amount,
      currency,
      payment_method,
      transaction_ref,
      shipping,
      items,
      callback_url,
      return_url,
      customization
    } = req.body;

    // Validate required fields
    if (!email || !phone || !amount || !transaction_ref) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Prepare Chapa API request
    const chapaPayload = {
      amount: amount,
      currency: currency,
      email: email,
      phone: phone,
      tx_ref: transaction_ref,
      callback_url: callback_url,
      return_url: return_url,
      customization: customization,
      payment_method: payment_method
    };

    // Call Chapa API
    const response = await axios.post(`${CHAPA_BASE_URL}/transaction/initialize`, chapaPayload, {
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Return success response with checkout URL
    res.json({
      success: true,
      checkout_url: response.data.data.checkout_url,
      tx_ref: transaction_ref
    });

  } catch (error) {
    console.error('Chapa initialization error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment initialization failed',
      error: error.response?.data?.message || error.message
    });
  }
});

// Verify Payment Endpoint
app.post('/api/chapa/verify', async (req, res) => {
  try {
    const { tx_ref } = req.body;

    if (!tx_ref) {
      return res.status(400).json({
        success: false,
        message: 'Transaction reference is required'
      });
    }

    // Call Chapa verification API
    const response = await axios.get(`${CHAPA_BASE_URL}/transaction/verify/${tx_ref}`, {
      headers: {
        'Authorization': `Bearer ${CHAPA_SECRET_KEY}`
      }
    });

    const transaction = response.data.data;

    res.json({
      success: true,
      status: transaction.status,
      transaction: {
        tx_ref: transaction.tx_ref,
        amount: transaction.amount,
        currency: transaction.currency,
        payment_method: transaction.payment_method,
        status: transaction.status,
        created_at: transaction.created_at,
        verified_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Chapa verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.response?.data?.message || error.message
    });
  }
});

// Webhook endpoint (optional but recommended)
app.post('/api/chapa/webhook', (req, res) => {
  // Handle Chapa webhook notifications
  // Verify webhook signature here
  const event = req.body;
  
  console.log('Webhook received:', event);
  
  // Process the event (update database, send emails, etc.)
  
  res.status(200).send('OK');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Security Considerations

### 1. API Key Security
- Never expose your Chapa secret key in frontend code
- Use environment variables to store sensitive data
- Implement proper authentication on your backend endpoints

### 2. Webhook Security
- Validate webhook signatures using the webhook secret
- Use HTTPS for all endpoints
- Implement rate limiting to prevent abuse

### 3. Transaction Verification
- Always verify transactions on the backend before confirming orders
- Don't rely solely on frontend success states
- Implement proper logging for audit trails

## Testing

### Test Mode
The frontend includes a test mode that simulates payment flow without calling the backend:
- Set `CHAPA_CONFIG.testMode = false` in app.js to use real backend
- For development, keep test mode enabled

### Test Cards/Data
Chapa provides test data for development:
- Test phone numbers
- Test amounts
- Simulated success/failure scenarios

## Frontend Configuration

To connect the frontend to your backend:

1. Update `CHAPA_CONFIG` in `app.js`:
```javascript
const CHAPA_CONFIG = {
  backendUrl: 'https://your-backend-domain.com/api/chapa/initialize',
  testMode: false, // Set to false for production
  supportedMethods: ['telebirr', 'cbe-birr', 'dashen', 'awash', 'boa', 'zemen'],
  currency: 'ETB'
};
```

2. Ensure CORS is properly configured on your backend
3. Update the callback and return URLs to match your domain

## Deployment Checklist

- [ ] Set up Chapa account and get API keys
- [ ] Configure environment variables
- [ ] Implement the backend endpoints
- [ ] Test payment flow in sandbox mode
- [ ] Update frontend configuration
- [ ] Set up webhook handling
- [ ] Configure SSL certificates
- [ ] Test end-to-end payment flow
- [ ] Monitor transaction logs
- [ ] Set up error handling and notifications

## Support

For Chapa-specific issues:
- Chapa Documentation: https://docs.chapa.co
- Chapa Support: support@chapa.co

For implementation issues, refer to the code comments and error logs in both frontend and backend.
