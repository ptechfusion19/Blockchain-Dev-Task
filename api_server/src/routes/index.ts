import { Router } from "express";
import {
  buyCard,
  getUserCard,
  withdrawFunds,
  getAccountBalance,
  estimateTokens,
  verifyAdmin,
  prepareBuyCard,
} from "../controllers/cardController";

const router = Router();

// Card buying endpoints
router.get("/prepare-buy-card", prepareBuyCard);
router.post("/buy-card", buyCard);
router.get("/user-card", getUserCard);
router.get("/account-balance", getAccountBalance);
router.get("/estimate-tokens", estimateTokens);

// Admin endpoints
router.post("/withdraw", withdrawFunds);
router.get("/verify-admin", verifyAdmin);

export default router;
