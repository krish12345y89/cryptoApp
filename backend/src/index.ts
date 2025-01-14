import express, { Request, Response } from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import axios from "axios";
import cors from "cors";
import mongoose from "mongoose";
import Alert from "./model/alert.js"; // Adjust the path as necessary
import { connectDb } from "./utils/connectDb.js";
import redisClient from "./utils/redis.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

connectDb();

// Fetch cryptocurrency prices
const fetchPrices = async () => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,ripple,litecoin,cardano,polkadot,chainlink,stellar,dogecoin,binancecoin&vs_currencies=usd,inr,eur"
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching cryptocurrency data:", error);
    return null;
  }
};

// Get prices with Redis caching
const getPrices = async () => {
  const cacheKey = "cryptoPrices";
  const cacheDuration = 60; // Cache duration in seconds

  const cachedPrices = await redisClient.get(cacheKey);
  if (cachedPrices) {
    console.log("Using cached prices");
    return JSON.parse(cachedPrices);
  }

  const prices = await fetchPrices();
  if (prices) {
    await redisClient.set(cacheKey, JSON.stringify(prices), "EX", cacheDuration);
  }
  return prices;
};

// Socket.io setup
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const triggeredAlerts = new Set();

const checkAlerts = async (prices) => {
  const alerts = await Alert.find();
  alerts.forEach((alert) => {
    const currentPrice = prices[alert.crypto]?.[alert.currency];
    if (currentPrice && currentPrice >= alert.priceThreshold) {
      const alertId = `${alert.crypto}-${alert.currency}-${alert.priceThreshold}`;
      if (!triggeredAlerts.has(alertId)) {
        io.emit("alert", {
          message: `${alert.crypto} price has crossed ${alert.priceThreshold} ${alert.currency}. Current price: ${currentPrice}`,
          id: alert._id,
        });
        triggeredAlerts.add(alertId);
      }
    } else {
      const alertId = `${alert.crypto}-${alert.currency}-${alert.priceThreshold}`;
      triggeredAlerts.delete(alertId);
    }
  });
};

setInterval(async () => {
  const prices = await getPrices();
  if (prices) {
    io.emit("cryptoData", prices);
    checkAlerts(prices);
  }
}, 10000);

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("getAlerts", async (userId) => {
    const alerts = await Alert.find({ userId });
    socket.emit("existingAlerts", alerts);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

app.delete("/alerts/:id", async (req: Request, res: any) => {
  const { id } = req.params;
  try {
    const alert = await Alert.findByIdAndDelete(id);
    if (!alert) {
      return res.status(404).json({ message: "Alert not found." });
    }
    res.status(200).json({ message: "Alert deleted successfully." });
  } catch (error) {
    console.error("Error deleting alert:", error);
    res.status(500).json({ message: "Error deleting alert" });
  }
});

app.post("/alerts", async (req: Request, res: Response) => {
  const { crypto, priceThreshold, userId, currency } = req.body;
  try {
    const alert = new Alert({ crypto, priceThreshold, userId, currency });
    await alert.save();
    res.status(201).json(alert);
  } catch (error) {
    console.error("Error creating alert:", error);
    res.status(500).json({ message: "Error creating alert" });
  }
});

app.get("/alerts/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const alerts = await Alert.find({ userId });
    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error fetching alerts:", error);
    res.status(500).json({ message: "Error fetching alerts" });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});