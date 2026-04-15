import express from "express";
import Stripe from "stripe";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.get("/", (_req, res) => {
  res.send("Backend running");
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
        source: "Prestige Black Booking Form",
        vehicle: b.vehicle || "",
        booking_type: b.booking_type || "",
        name: b.name || "",
        phone: b.phone || "",
        email: b.email || "",
        pickup_date: b.pickup_date || "",
        return_date: b.return_date || "",
        pickup_time: b.pickup_time || "",
        dropoff_time: b.dropoff_time || "",
        hourly_date: b.hourly_date || "",
        hourly_hours: b.hourly_hours || "",
        hourly_start_time: b.hourly_start_time || ""
      }
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe session error:", err);
    return res.status(500).json({ error: "Unable to create payment session." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Running on ${port}`);
});
