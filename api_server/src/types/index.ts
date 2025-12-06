export enum CardType {
  Bronze = 0,
  Silver = 1,
  Gold = 2,
  Platinum = 3,
}

export interface BuyCardRequest {
  cardType: CardType;
  amount: number;
  userPubkey: string;
  userPrivateKey: number[];
}

export interface WithdrawRequest {
  amount: number;
  adminPrivateKey: number[];
  userCardPubkey: string;
}

export interface CardData {
  owner: string;
  cardType: CardType;
  amount_paid: number;
  tokens_minted: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
