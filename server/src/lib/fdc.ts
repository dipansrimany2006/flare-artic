import { getPublicClient, getWalletClient, getOperatorAccount, getContractAddress } from './flare';
import { parseAbi, encodeAbiParameters, keccak256, toHex, parseEther } from 'viem';

// FDC endpoints
const FDC_VERIFIER_URL = process.env.FDC_VERIFIER_URL || 'https://fdc-verifiers-testnet.flare.network';
const DA_LAYER_URL = process.env.DA_LAYER_URL || 'https://da-layer-testnet.flare.network';

// FDC Hub ABI (from @flarenetwork/flare-periphery-contract-artifacts)
const FDC_HUB_ABI = parseAbi([
  'function requestAttestation(bytes _data) external payable',
  'function fdcRequestFeeConfigurations() view returns (address)',
]);

const FLARE_SYSTEMS_MANAGER_ABI = parseAbi([
  'function getCurrentVotingEpochId() view returns (uint32)',
]);

// Attestation type for Payment
const ATTESTATION_TYPE = 'Payment';
const SOURCE_ID = 'testXRP'; // XRPL testnet

// Convert string to bytes32 hex (right-padded with zeros)
function stringToBytes32Hex(str: string): string {
  const bytes = new TextEncoder().encode(str);
  const padded = new Uint8Array(32);
  padded.set(bytes.slice(0, 32));
  return '0x' + Buffer.from(padded).toString('hex');
}

interface AttestationRequest {
  attestationType: string;
  sourceId: string;
  requestBody: {
    transactionId: string;
    inUtxo: string;
    utxo: string;
  };
}

interface AttestationResponse {
  abiEncodedRequest: string;
  status: string;
}

interface ProofResponse {
  merkleProof: string[];
  data: any;
}

/**
 * Request a Payment attestation for an XRPL transaction
 * Retries if transaction not yet visible to verifier
 */
export async function requestPaymentAttestation(xrplTxHash: string, maxRetries = 5): Promise<string> {
  console.log(`[FDC] Requesting attestation for XRPL TX: ${xrplTxHash}`);

  // Wait for XRPL transaction to be fully confirmed and visible to verifier
  console.log(`[FDC] Waiting 10s for XRPL tx to propagate...`);
  await sleep(10000);

  // Prepare the attestation request with bytes32 encoded type and source
  const request: AttestationRequest = {
    attestationType: stringToBytes32Hex(ATTESTATION_TYPE),
    sourceId: stringToBytes32Hex(SOURCE_ID),
    requestBody: {
      transactionId: xrplTxHash.startsWith('0x') ? xrplTxHash : `0x${xrplTxHash}`,
      inUtxo: '0', // Not used for XRP
      utxo: '0',   // Not used for XRP
    },
  };

  // Call verifier to prepare the request
  const prepareUrl = `${FDC_VERIFIER_URL}/verifier/xrp/${ATTESTATION_TYPE}/prepareRequest`;
  console.log(`[FDC] Calling verifier: ${prepareUrl}`);

  const response = await fetch(prepareUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': process.env.FDC_API_KEY || '',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`FDC verifier error: ${error}`);
  }

  const result = await response.json();
  console.log(`[FDC] Verifier response:`, JSON.stringify(result, null, 2));

  // Handle different response formats
  const abiEncodedRequest = result.abiEncodedRequest || result.abiEncodedResponse || result.response?.abiEncodedRequest;

  // Retry if transaction not yet visible
  if (!abiEncodedRequest && result.status?.includes('DOES NOT EXIST') && maxRetries > 0) {
    console.log(`[FDC] Transaction not yet visible, retrying in 10s... (${maxRetries} retries left)`);
    await sleep(10000);
    return requestPaymentAttestation(xrplTxHash, maxRetries - 1);
  }

  if (!abiEncodedRequest) {
    throw new Error(`No abiEncodedRequest in verifier response: ${JSON.stringify(result)}`);
  }

  return abiEncodedRequest;
}

/**
 * Submit attestation request to FDC Hub
 */
export async function submitAttestationRequest(abiEncodedRequest: string): Promise<number> {
  console.log('[FDC] Submitting attestation request to FDC Hub');

  const client = getPublicClient();
  const wallet = getWalletClient();
  const account = getOperatorAccount();

  // Get FDC Hub address from registry
  const fdcHubAddress = await getContractAddress('FdcHub');
  console.log(`[FDC] FDC Hub address: ${fdcHubAddress}`);

  // Get current voting epoch
  const flareSystemsManager = await getContractAddress('FlareSystemsManager');
  const currentRoundId = await client.readContract({
    address: flareSystemsManager,
    abi: FLARE_SYSTEMS_MANAGER_ABI,
    functionName: 'getCurrentVotingEpochId',
  });

  console.log(`[FDC] Current voting round: ${currentRoundId}`);

  // Submit attestation request to FDC Hub contract
  const requestBytes = abiEncodedRequest.startsWith('0x')
    ? abiEncodedRequest as `0x${string}`
    : `0x${abiEncodedRequest}` as `0x${string}`;

  // Simulate first
  const { request } = await client.simulateContract({
    address: fdcHubAddress,
    abi: FDC_HUB_ABI,
    functionName: 'requestAttestation',
    args: [requestBytes],
    account,
    value: parseEther('0.001'), // Small fee for attestation request
  });

  // Execute
  const hash = await wallet.writeContract(request);
  console.log(`[FDC] Attestation request submitted: ${hash}`);

  // Wait for confirmation
  const receipt = await client.waitForTransactionReceipt({ hash });
  console.log(`[FDC] Request confirmed in block ${receipt.blockNumber}`);

  return Number(currentRoundId) + 1; // Proof will be available in next round
}

/**
 * Wait for attestation proof to be available
 * Polls DA layer directly instead of checking on-chain finalization
 */
export async function waitForProof(
  abiEncodedRequest: string,
  startingRoundId: number,
  maxWaitMs: number = 300000 // 5 minutes max
): Promise<ProofResponse> {
  console.log(`[FDC] Waiting for proof, starting from round: ${startingRoundId}`);
  console.log(`[FDC] Attestation rounds take 90-180 seconds to finalize...`);

  const startTime = Date.now();
  const pollInterval = 15000; // 15 seconds (to avoid rate limiting)

  // Wait initial 60 seconds before first poll (rounds take 90-180s)
  console.log(`[FDC] Waiting 60s for round to finalize...`);
  await sleep(60000);

  // Check multiple rounds since we might not know exactly which round has our proof
  while (Date.now() - startTime < maxWaitMs) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    // Try a range of rounds around the expected one
    for (let roundOffset = 0; roundOffset <= 4; roundOffset++) {
      const roundId = startingRoundId + roundOffset;

      try {
        console.log(`[FDC] Checking DA layer for proof in round ${roundId}... (${elapsed}s)`);
        const proof = await fetchProofFromDALayer(abiEncodedRequest, roundId);

        if (proof && proof.merkleProof && proof.merkleProof.length > 0) {
          console.log(`[FDC] Proof found in round ${roundId}!`);
          return proof;
        }
      } catch (error: any) {
        // Proof not available in this round yet
      }

      // Small delay between round checks to avoid rate limiting
      await sleep(500);
    }

    console.log(`[FDC] Proof not yet available, waiting... (${elapsed}s)`);
    await sleep(pollInterval);
  }

  throw new Error(`Timeout waiting for FDC proof after ${maxWaitMs / 1000}s`);
}

/**
 * Fetch proof from DA Layer using the abiEncodedRequest
 */
async function fetchProofFromDALayer(abiEncodedRequest: string, votingRoundId: number): Promise<ProofResponse | null> {
  // Use v1 API endpoint
  const url = `${DA_LAYER_URL}/api/v1/fdc/proof-by-request-round-raw`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.FDC_API_KEY || '',
      },
      body: JSON.stringify({
        votingRoundId,
        requestBytes: abiEncodedRequest,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`[FDC] DA layer error for round ${votingRoundId}: ${response.status} - ${errorText.substring(0, 100)}`);
      return null;
    }

    const result = await response.json();
    console.log(`[FDC] DA layer response for round ${votingRoundId}:`, JSON.stringify(result).substring(0, 200));
    return result as ProofResponse;
  } catch (error: any) {
    console.log(`[FDC] DA layer fetch error: ${error.message}`);
    return null;
  }
}

/**
 * Encode Payment attestation request bytes
 */
function encodePaymentRequest(xrplTxHash: string): string {
  // Attestation type hash
  const attestationTypeHash = keccak256(toHex(ATTESTATION_TYPE));
  const sourceIdHash = keccak256(toHex(SOURCE_ID));

  // Encode request body
  const requestBody = encodeAbiParameters(
    [
      { type: 'bytes32', name: 'transactionId' },
      { type: 'uint256', name: 'inUtxo' },
      { type: 'uint256', name: 'utxo' },
    ],
    [
      xrplTxHash.startsWith('0x') ? xrplTxHash as `0x${string}` : `0x${xrplTxHash}` as `0x${string}`,
      BigInt(0),
      BigInt(0),
    ]
  );

  // Combine into full request
  return encodeAbiParameters(
    [
      { type: 'bytes32', name: 'attestationType' },
      { type: 'bytes32', name: 'sourceId' },
      { type: 'bytes', name: 'requestBody' },
    ],
    [attestationTypeHash, sourceIdHash, requestBody]
  );
}

/**
 * Build the full proof for MasterAccountController
 */
export function buildExecutionProof(proofResponse: ProofResponse): `0x${string}` {
  // Encode the proof for the MasterAccountController
  const proof = encodeAbiParameters(
    [
      { type: 'bytes32[]', name: 'merkleProof' },
      { type: 'bytes', name: 'data' },
    ],
    [
      proofResponse.merkleProof.map(p => p as `0x${string}`),
      JSON.stringify(proofResponse.data) as unknown as `0x${string}`, // This would need proper encoding
    ]
  );

  return proof;
}

/**
 * Full attestation flow: request -> submit -> wait -> build proof
 */
export async function getPaymentProof(xrplTxHash: string): Promise<`0x${string}`> {
  // Step 1: Request attestation from verifier
  const abiEncodedRequest = await requestPaymentAttestation(xrplTxHash);

  // Step 2: Submit to FDC Hub on-chain
  const votingRoundId = await submitAttestationRequest(abiEncodedRequest);

  // Step 3: Wait for proof from DA Layer (using same abiEncodedRequest)
  const proofResponse = await waitForProof(abiEncodedRequest, votingRoundId);

  // Step 4: Build execution proof
  const proof = buildExecutionProof(proofResponse);

  return proof;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
