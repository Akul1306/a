import express from "express";
import cors from "cors";
import AppError from "./utils/appError.js";
// import { protect } from "./utils/protect.js";
import authRouter from "./modules/auth/authRoutes.js";
import userRouter from "./modules/auth/userRoutes.js";
import blogRouter from "./modules/blogs/blogRoutes.js";
import paperRouter from "./modules/papers/paperRoutes.js";
import kundliRouter from "./modules/kundli/kundliRoutes.js";
import productRouter from "./modules/store/productRoutes.js";
import orderRouter from "./modules/store/orderRoutes.js";
import testRouter from "./modules/tests/testRoutes.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:3000",
      "https://a-mu-lime.vercel.app/",
    ],
    credentials: true,
  }),
);

app.use(express.json());

// app.use("/api/petvet/users", userRouter);
// app.use("/api/petvet/", petRouter);
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/papers", paperRouter);
app.use("/api/kundli", kundliRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/tests", testRouter);

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
  });
});

export default app;
