
/**
 * BACKEND PAYMENT PROCESSOR (Node.js / Express Example)
 * 
 * This file represents the server-side logic required to process payments securely.
 * In a real deployment, this would live in your API routes (e.g., Next.js API routes or a standalone Express server).
 * 
 * Dependencies:
 * - express
 * - stripe
 * - body-parser
 * - cors
 */

const express = require('express');
const Stripe = require('stripe');
const bodyParser = require('body-parser');
const cors = require('cors');

// Initialize Stripe with your Secret Key (store in .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

const app = express();

// Use raw body parser for webhook signature verification
app.use('/webhook', bodyParser.raw({ type: 'application/json' }));
app.use(express.json());
app.use(cors({ origin: process.env.CLIENT_URL })); // e.g. 'https://novaprogress.com'

/**
 * 1. CREATE CHECKOUT SESSION
 * Called by the frontend when user clicks "Confirm Transaction".
 */
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { userId } = req.body; // Pass user ID to track who paid

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'NovaProgress - Neural Access (V8)',
              description: 'Lifetime Premium Upgrade including AI Diagnostics & Roadmap.',
              images: ['https://novaprogress.com/assets/premium-badge.png'],
            },
            unit_amount: 400, // $4.00 in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/dashboard?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/dashboard?canceled=true`,
      metadata: {
        userId: userId, // Metadata is crucial for the webhook to identify the user
        productType: 'neural_access_v8'
      },
    });

    res.json({ url: session.url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 2. STRIPE WEBHOOK HANDLER
 * Listens for events from Stripe (e.g., payment successful).
 * Updates the user's profile in Supabase/Database to 'premium: true'.
 */
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.userId;

    console.log(`Payment successful for User: ${userId}`);

    // TODO: Update database (Supabase Example)
    /*
    const { error } = await supabase
      .from('profiles')
      .update({ is_premium: true })
      .eq('id', userId);
      
    if (error) console.error('DB Update Failed', error);
    */
  }

  res.json({ received: true });
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Payment Server running on port ${PORT}`));
