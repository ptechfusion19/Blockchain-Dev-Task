import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api", routes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Solana Card Buying API Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Solana Card Buying API Server",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      buyCard: "POST /api/buy-card",
      getUserCard: "GET /api/user-card",
      withdrawFunds: "POST /api/withdraw",
      getAccountBalance: "GET /api/account-balance",
      estimateTokens: "GET /api/estimate-tokens",
      verifyAdmin: "GET /api/verify-admin",
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.path,
  });
});

// Error handler
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      message: err.message,
    });
  }
);

app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` API Documentation available at http://localhost:${PORT}`);
});
