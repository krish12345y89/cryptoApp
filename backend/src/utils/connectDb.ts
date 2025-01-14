import { NextFunction } from "express";
import mongoose from "mongoose";
let next:NextFunction
export const connectDb = async () => {
    try {
      await mongoose.connect(process.env.MONGO_URI as string).then(() => {
        console.log("connect to the database");
      });
    } catch (error) {
      console.error(error);
    }
  };
  