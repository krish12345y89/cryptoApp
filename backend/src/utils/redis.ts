import { config } from "dotenv";
import { Redis } from "ioredis";
import { RedisClient } from "ioredis/built/connectors/SentinelConnector/types.js";
config();

  const redisClient:Redis = new Redis({
    host: process.env.REDIS_HOST as string,
    port: Number(process.env.REDIS_PORT),
    password: process.env.REDIS_PASS as string,
  })

  redisClient.on("connect", () => {
    console.log("Connected to Redis");
  });

  redisClient.on("error", (err) => {
    console.error("Redis connection error:", err);
  });


export default redisClient;
