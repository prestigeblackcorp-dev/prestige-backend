import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.use(cors());

app.post("/api/stripe-webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const payload = {
        source: "Stripe Paid Date Lock",
        payment_status: session.payment_status || "",
        amount_total: session.amount_total || "",
        customer_email: session.customer_details?.email || session.customer_email || "",
        stripe_session_id: session.id || "",
        vehicle: session.metadata?.vehicle || "",
        name: session.metadata?.name || "",
        phone: session.metadata?.phone || "",
        email: session.metadata?.email || "",
        pickup_date: session.metadata?.pickup_date || "",
        return_date: session.metadata?.return_date || "",
        pickup_time: session.metadata?.pickup_time || "",
        dropoff_time: session.metadata?.dropoff_time || ""
      };

      await fetch("https://hooks.zapier.com/hooks/catch/26753959/ux9y09p/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      console.log("Paid booking sent to Zapier:", payload);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook handling error:", err);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Backend running");
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post("/api/create-date-lock-session", async (req, res) => {
  try {
    const b = req.body || {};

    if (!b.vehicle || !b.name || !b.phone || !b.email) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: b.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${b.vehicle} — Date Lock Deposit`
            },
            unit_amount: 10000
          },
          quantity: 1
        }
      ],
      success_url: "https://prestigeblackrentals.com/pages/date-lock-success",
      cancel_url: "https://prestigeblackrentals.com/pages/book",
      metadata: {
        vehicle: b.vehicle || "",
        name: b.name || "",
        phone: b.phone || "",
        email: b.email || "",
        pickup_date: b.pickup_date || "",
        return_date: b.return_date || "",
        pickup_time: b.pickup_time || "",
        dropoff_time: b.dropoff_time || ""
      }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    return res.status(500).json({ error: "Stripe error" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0", () => {
  console.log(`Running on ${port}`);
});
