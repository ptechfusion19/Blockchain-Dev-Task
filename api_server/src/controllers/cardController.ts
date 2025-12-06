import * as anchor from "@coral-xyz/anchor";
import { Request, Response } from "express";
import {
  PROGRAM_ID,
  ADMIN_PUBKEY,
  USER_PUBKEY,
  CARD_MINT_PUBKEY_STRING,
  USER_PRIVATE_KEY_ARRAY,
  ADMIN_PRIVATE_KEY_ARRAY,
  MINT_AUTHORITY_PUBKEY,
} from "../config/anchor";
import {
  getPDAForUser,
  getCardPrice,
  getCardName,
  lamportsToSOL,
  keypairFromSecretKey,
} from "../utils/helpers";
import { ApiResponse, CardData } from "../types";
import IDLJson from "../idl/user_card_program.json";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export async function buyCard(req: Request, res: Response) {
  try {
    const { cardType, amount, userTokenAccountPubkey } = req.body;

    if ((cardType !== 0 && !cardType) || !amount || !userTokenAccountPubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: cardType, amount, userTokenAccountPubkey",
        hint: "userPubkey and cardMintPubkey are read from .env (hardcoded)",
      } as ApiResponse<null>);
    }

    if (cardType < 0 || cardType > 3) {
      return res.status(400).json({
        success: false,
        error: "Invalid cardType (0-3)",
      } as ApiResponse<null>);
    }

    const expectedPrice = getCardPrice(cardType);
    if (amount < expectedPrice) {
      return res.status(400).json({
        success: false,
        error: `Insufficient payment. Required: ${lamportsToSOL(expectedPrice)} SOL, Got: ${lamportsToSOL(amount)} SOL`,
      } as ApiResponse<null>);
    }

    if (!USER_PRIVATE_KEY_ARRAY || USER_PRIVATE_KEY_ARRAY.length === 0) {
      return res.status(500).json({
        success: false,
        error: "USER_PRIVATE_KEY_ARRAY not configured in .env",
      } as ApiResponse<null>);
    }

    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const userKeypair = anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(USER_PRIVATE_KEY_ARRAY)
    );

    if (userKeypair.publicKey.toString() !== USER_PUBKEY.toString()) {
      return res.status(500).json({
        success: false,
        error: "Private key in .env does not match USER_PUBKEY",
      } as ApiResponse<null>);
    }

    // Load admin keypair if mint_authority is admin
    let adminKeypair: anchor.web3.Keypair | null = null;
    if (MINT_AUTHORITY_PUBKEY.equals(ADMIN_PUBKEY)) {
      if (!ADMIN_PRIVATE_KEY_ARRAY || ADMIN_PRIVATE_KEY_ARRAY.length === 0) {
        return res.status(500).json({
          success: false,
          error: "ADMIN_PRIVATE_KEY_ARRAY not configured in .env",
        } as ApiResponse<null>);
      }
      adminKeypair = anchor.web3.Keypair.fromSecretKey(
        new Uint8Array(ADMIN_PRIVATE_KEY_ARRAY)
      );
    }

    const userTokenAccount = new anchor.web3.PublicKey(userTokenAccountPubkey);
    const cardMint = new anchor.web3.PublicKey(CARD_MINT_PUBKEY_STRING);

    const userWallet = new anchor.Wallet(userKeypair);
    const provider = new anchor.AnchorProvider(connection, userWallet, {
      commitment: "confirmed",
    });

    const program = new anchor.Program(IDLJson as any, provider as any);

    const userCardPDA = getPDAForUser(USER_PUBKEY);

    const cardTypeEnum = { [["bronze", "silver", "gold", "platinum"][cardType]]: {} };

    try {
      const signers = [userKeypair];
      if (adminKeypair) {
        signers.push(adminKeypair);
      }

      const tx = await program.methods
        .initializeUserCard(cardTypeEnum, new anchor.BN(amount))
        .accounts({
          userCard: userCardPDA,
          authority: USER_PUBKEY,
          cardMint: cardMint,
          userTokenAccount: userTokenAccount,
          mintAuthority: MINT_AUTHORITY_PUBKEY,
          tokenProgram: new anchor.web3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers(signers)
        .rpc();

      return res.status(200).json({
        success: true,
        data: {
          details: {
            cardType: getCardName(cardType),
            amountPaid: lamportsToSOL(amount),
            tokensReceived: amount,
            ratio: "1:1",
            userPubkey: USER_PUBKEY.toString(),
            cardMintPubkey: cardMint.toString(),
            userTokenAccountPubkey: userTokenAccount.toString(),
            userCardPDA: userCardPDA.toString(),
            transactionSignature: tx,
          },
        },
        message: "✅ Card purchased and tokens minted successfully!",
      } as ApiResponse<any>);
    } catch (programError: any) {
      console.error("Program execution error:", programError);
      return res.status(400).json({
        success: false,
        error: "Transaction execution failed",
        details: programError.message,
      } as ApiResponse<null>);
    }
  } catch (error: any) {
    console.error("Buy card error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}

export async function getUserCard(req: Request, res: Response) {
  try {
    const { userPubkey } = req.query;

    if (!userPubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing userPubkey query parameter",
      } as ApiResponse<null>);
    }

    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const userPublicKey = new anchor.web3.PublicKey(userPubkey as string);
    const userCardPDA = getPDAForUser(userPublicKey);

    const wallet = new anchor.Wallet(anchor.web3.Keypair.generate());
    const provider = new anchor.AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });

    const program = new anchor.Program(IDLJson as any, provider as any);

    const account = await (program.account as any).userCardAccount.fetchNullable(
      userCardPDA
    );

    if (!account) {
      return res.status(404).json({
        success: false,
        error: "User card not found",
      } as ApiResponse<null>);
    }

    const cardData: CardData = {
      owner: account.owner.toString(),
      cardType: Object.keys(account.cardType)[0] as any,
      amount_paid: account.amountPaid.toNumber(),
      tokens_minted: account.tokensMinted.toNumber(),
    };

    return res.status(200).json({
      success: true,
      data: cardData,
      message: `User card retrieved successfully (Type: ${getCardName(cardData.cardType)})`,
    } as ApiResponse<CardData>);
  } catch (error: any) {
    console.error("Get user card error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}

export async function withdrawFunds(req: Request, res: Response) {
  try {
    const { amount, userCardPubkey } = req.body;

    if (!amount || !userCardPubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: amount, userCardPubkey",
      } as ApiResponse<null>);
    }

    const ADMIN_PRIVATE_KEY_ARRAY = process.env.ADMIN_PRIVATE_KEY_ARRAY
      ? JSON.parse(process.env.ADMIN_PRIVATE_KEY_ARRAY)
      : [];

    if (!ADMIN_PRIVATE_KEY_ARRAY || ADMIN_PRIVATE_KEY_ARRAY.length === 0) {
      return res.status(500).json({
        success: false,
        error: "ADMIN_PRIVATE_KEY_ARRAY not configured in .env",
      } as ApiResponse<null>);
    }

    const adminKeypair = anchor.web3.Keypair.fromSecretKey(
      new Uint8Array(ADMIN_PRIVATE_KEY_ARRAY)
    );

    if (adminKeypair.publicKey.toString() !== ADMIN_PUBKEY.toString()) {
      return res.status(403).json({
        success: false,
        error: "Invalid admin credentials",
      } as ApiResponse<null>);
    }

    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const userCardPublicKey = new anchor.web3.PublicKey(userCardPubkey);

    const adminWallet = new anchor.Wallet(adminKeypair);
    const provider = new anchor.AnchorProvider(connection, adminWallet, {
      commitment: "confirmed",
    });

    const program = new anchor.Program(IDLJson as any, provider as any);

    const userCardAccount = await connection.getAccountInfo(userCardPublicKey);

    if (!userCardAccount) {
      return res.status(404).json({
        success: false,
        error: "User card account not found",
      } as ApiResponse<null>);
    }

    const currentBalance = userCardAccount.lamports;

    if (currentBalance < amount) {
      return res.status(400).json({
        success: false,
        error: `Insufficient funds. Available: ${lamportsToSOL(currentBalance)} SOL, Requested: ${lamportsToSOL(amount)} SOL`,
      } as ApiResponse<null>);
    }

    const tx = await program.methods
      .withdrawFunds(new anchor.BN(amount))
      .accounts({
        userCard: userCardPublicKey,
        admin: adminKeypair.publicKey,
      })
      .signers([adminKeypair])
      .rpc();

    return res.status(200).json({
      success: true,
      data: {
        transactionSignature: tx,
        amount: lamportsToSOL(amount),
        unit: "SOL",
      },
      message: `Withdrawal successful: ${lamportsToSOL(amount)} SOL transferred to admin`,
    } as ApiResponse<any>);
  } catch (error: any) {
    console.error("Withdraw funds error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}

export async function getAccountBalance(req: Request, res: Response) {
  try {
    const { userPubkey } = req.query;

    if (!userPubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing userPubkey query parameter",
      } as ApiResponse<null>);
    }

    const connection = new anchor.web3.Connection(RPC_URL, "confirmed");
    const userPublicKey = new anchor.web3.PublicKey(userPubkey as string);
    const userCardPDA = getPDAForUser(userPublicKey);

    const balance = await connection.getBalance(userCardPDA);

    return res.status(200).json({
      success: true,
      data: {
        balanceLamports: balance,
        balanceSOL: lamportsToSOL(balance),
        account: userCardPDA.toString(),
      },
      message: "Account balance retrieved successfully",
    } as ApiResponse<any>);
  } catch (error: any) {
    console.error("Get account balance error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}

export async function estimateTokens(req: Request, res: Response) {
  try {
    const { cardType, amount } = req.query;

    if (cardType === undefined || !amount) {
      return res.status(400).json({
        success: false,
        error: "Missing required parameters: cardType, amount",
      } as ApiResponse<null>);
    }

    const cardTypeNum = parseInt(cardType as string);
    const amountNum = parseInt(amount as string);

    if (cardTypeNum < 0 || cardTypeNum > 3) {
      return res.status(400).json({
        success: false,
        error: "Invalid cardType (0-3)",
      } as ApiResponse<null>);
    }

    const expectedPrice = getCardPrice(cardTypeNum);

    if (amountNum < expectedPrice) {
      return res.status(400).json({
        success: false,
        error: `Insufficient payment. Minimum: ${lamportsToSOL(expectedPrice)} SOL`,
      } as ApiResponse<null>);
    }

    return res.status(200).json({
      success: true,
      data: {
        cardType: getCardName(cardTypeNum),
        amountPaid: lamportsToSOL(amountNum),
        tokensToMint: amountNum,
        ratio: "1:1",
      },
      message: "Token estimate calculated successfully",
    } as ApiResponse<any>);
  } catch (error: any) {
    console.error("Estimate tokens error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}

export async function verifyAdmin(req: Request, res: Response) {
  try {
    const { adminPubkey } = req.query;

    if (!adminPubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing adminPubkey query parameter",
      } as ApiResponse<null>);
    }

    const providedPubkey = new anchor.web3.PublicKey(adminPubkey as string);
    const isAdmin = providedPubkey.equals(ADMIN_PUBKEY);

    return res.status(200).json({
      success: true,
      data: {
        isAdmin,
        expectedAdmin: ADMIN_PUBKEY.toString(),
        providedAdmin: providedPubkey.toString(),
      },
      message: isAdmin ? "Valid admin" : "Not admin",
    } as ApiResponse<any>);
  } catch (error: any) {
    console.error("Verify admin error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}

export async function prepareBuyCard(req: Request, res: Response) {
  try {
    const { userPubkey } = req.query;

    if (!userPubkey) {
      return res.status(400).json({
        success: false,
        error: "Missing userPubkey query parameter",
      } as ApiResponse<null>);
    }

    const userPublicKey = new anchor.web3.PublicKey(userPubkey as string);

    return res.status(200).json({
      success: true,
      data: {
        cardMintPubkey: CARD_MINT_PUBKEY_STRING,
        userPubkey: userPublicKey.toString(),
        instructions: {
          step1: "Create your token account if you don't have one",
          step2: `Run: spl-token create-account ${CARD_MINT_PUBKEY_STRING}`,
          step3: "Copy the account address from output",
          step4: "Use that address as 'userTokenAccountPubkey' in buy-card endpoint",
        },
        cardPrices: {
          bronze: "0.125 SOL (cardType: 0)",
          silver: "0.25 SOL (cardType: 1)",
          gold: "0.5 SOL (cardType: 2)",
          platinum: "1 SOL (cardType: 3)",
        },
      },
      message: "Mint address and instructions provided",
    } as ApiResponse<any>);
  } catch (error: any) {
    console.error("Prepare buy card error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    } as ApiResponse<null>);
  }
}
