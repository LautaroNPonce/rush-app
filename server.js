import "dotenv/config";
import express from "express";
import cors from "cors";
import { MercadoPagoConfig, Preference } from "mercadopago";

const app = express();
const PORT = process.env.PORT || 3001;

// Mercado Pago client
const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 5000 },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// POST /api/create-preference
// Body: { title, unit_price, quantity, hours }
app.post("/api/create-preference", async (req, res) => {
  const { title, unit_price, quantity = 1, hours } = req.body;

  if (!title || !unit_price) {
    return res.status(400).json({ error: "title y unit_price son requeridos" });
  }

  try {
    const preferenceApi = new Preference(mpClient);

    const preference = await preferenceApi.create({
      body: {
        items: [
          {
            title: `${title} – ${hours}h`,
            unit_price: Number(unit_price),
            quantity: Number(quantity),
            currency_id: "ARS",
          },
        ],
        back_urls: {
          success: "http://localhost:5173/?mp_status=success",
          failure: "http://localhost:5173/?mp_status=failure",
          pending: "http://localhost:5173/?mp_status=pending",
        },
        statement_descriptor: "RUSH APP",
        external_reference: `RUSH-${Date.now()}`,
      },
    });

    return res.json({ preference_id: preference.id });
  } catch (err) {
    console.error("Error creando preferencia MP:", err);
    return res.status(500).json({ error: "Error creando preferencia de pago" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Rush backend corriendo en http://localhost:${PORT}`);
});
