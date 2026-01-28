export type TransactionStatus =
  | 'pending'
  | 'proving'
  | 'executing'
  | 'completed'
  | 'failed';

export type InstructionType = 'firelight' | 'upshift' | 'split';

export interface Transaction {
  id: number;
  xrplTxHash: string;
  xrplAddress: string;
  xrpAmount: string;
  instructionType: InstructionType;
  status: TransactionStatus;
  flareSmartAccount: string | null;
  flareTxHash: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Strategy {
  id: string;
  name: string;
  description: string;
  apy: string;
  risk: 'low' | 'medium' | 'high';
  enabled: boolean;
  instructionCode: number;
}

export interface PrepareRequest {
  xrplAddress: string;
  strategy: string;
  amountXRP: string;
}

export interface PrepareResponse {
  destinationAddress: string;
  memo: string;
  amountDrops: string;
}

export interface StatusResponse {
  status: TransactionStatus;
  flareSmartAccount: string | null;
  flareTxHash: string | null;
  error: string | null;
}

export interface HoldingsResponse {
  fxrpBalance: string;
  stXrpBalance: string;
  totalValueXRP: string;
}

export interface FDCProof {
  merkleProof: string[];
  data: {
    attestationType: string;
    sourceId: string;
    votingRound: number;
    lowestUsedTimestamp: number;
    requestBody: {
      transactionId: string;
      inUtxo: string;
      utxo: string;
    };
    responseBody: {
      blockNumber: string;
      blockTimestamp: string;
      sourceAddressHash: string;
      receivingAddressHash: string;
      intendedReceivingAddressHash: string;
      standardPaymentReference: string;
      spentAmount: string;
      intendedSpentAmount: string;
      receivedAmount: string;
      intendedReceivedAmount: string;
      oneToOne: boolean;
      status: string;
    };
  };
}
