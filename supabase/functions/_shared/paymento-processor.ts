import { isPaymentoToken, sha256Hex } from './paymento.ts';

const PAYMENTO_VERIFY_URL = 'https://api.paymento.io/v1/payment/verify';
const APPROVED_STATUS = 8;
const MAX_CALLBACKS_PER_RUN = 25;

type RpcClient = {
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

type QueueCallback = {
  provider_event_id: string;
  lease_id: string;
  order_id: string;
  payment_id: string;
  payment_token: string;
  token_hash: string;
  reported_status: number;
  attempt_count: number;
};

type PaymentoVerifyEnvelope = {
  success?: unknown;
  message?: unknown;
  body?: {
    token?: unknown;
    orderId?: unknown;
    orderStatus?: unknown;
    settlement?: { requestedFiatAmount?: unknown } | null;
  } | null;
};

async function finishCallback(
  client: RpcClient,
  callback: QueueCallback,
  result: {
    verified: boolean;
    permanent?: boolean;
    tokenHash?: string | null;
    orderId?: string | null;
    status?: number | null;
    requestedAmount?: number | null;
    error?: string;
  },
): Promise<any> {
  const { data, error } = await client.rpc('finish_paymento_ipn', {
    p_provider_event_id: callback.provider_event_id,
    p_lease_id: callback.lease_id,
    p_verified: result.verified,
    p_permanent_failure: result.permanent === true,
    p_verified_token_hash: result.tokenHash ?? null,
    p_verified_order_id: result.orderId ?? null,
    p_verified_order_status: result.status ?? null,
    p_verified_requested_amount: result.requestedAmount ?? null,
    p_error: result.error ?? null,
  });
  if (error) throw new Error('Could not persist Paymento callback processing result.');
  return data;
}

export async function processPendingPaymentoCallbacks(
  serviceClient: RpcClient,
  apiKey: string,
  requestedLimit = 10,
): Promise<{ claimed: number; approved: number; retrying: number; needsReview: number }> {
  if (!apiKey) throw new Error('Paymento API key is not configured.');
  const safeLimit = Math.min(Math.max(Math.floor(requestedLimit), 1), MAX_CALLBACKS_PER_RUN);
  const { data: callbacks, error: claimError } = await serviceClient.rpc('claim_paymento_ipn_callbacks', {
    p_limit: safeLimit,
  });
  if (claimError || !Array.isArray(callbacks)) {
    throw new Error('Could not claim stored Paymento callbacks.');
  }

  const summary = { claimed: callbacks.length, approved: 0, retrying: 0, needsReview: 0 };
  for (const value of callbacks as QueueCallback[]) {
    const callback = value;
    if (!isPaymentoToken(callback.payment_token)) {
      const result = await finishCallback(serviceClient, callback, {
        verified: false,
        permanent: true,
        error: 'Stored Paymento callback token is invalid.',
      });
      if (result?.needs_review) summary.needsReview += 1;
      continue;
    }

    let response: Response;
    try {
      response = await fetch(PAYMENTO_VERIFY_URL, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token: callback.payment_token }),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      const result = await finishCallback(serviceClient, callback, {
        verified: false,
        error: 'Paymento Verify could not be reached; the callback remains queued for retry.',
      });
      if (result?.retry_scheduled) summary.retrying += 1;
      else if (result?.needs_review) summary.needsReview += 1;
      continue;
    }

    if (!response.ok) {
      const result = await finishCallback(serviceClient, callback, {
        verified: false,
        error: `Paymento Verify returned HTTP ${response.status}; the callback remains queued for retry.`,
      });
      if (result?.retry_scheduled) summary.retrying += 1;
      else if (result?.needs_review) summary.needsReview += 1;
      continue;
    }

    let envelope: PaymentoVerifyEnvelope;
    try {
      envelope = await response.json() as PaymentoVerifyEnvelope;
    } catch {
      const result = await finishCallback(serviceClient, callback, {
        verified: false,
        error: 'Paymento Verify returned an unreadable response; the callback remains queued for retry.',
      });
      if (result?.retry_scheduled) summary.retrying += 1;
      else if (result?.needs_review) summary.needsReview += 1;
      continue;
    }

    const body = envelope && typeof envelope === 'object' && envelope.body && typeof envelope.body === 'object'
      ? envelope.body
      : null;
    const bodyStatus = typeof body?.orderStatus === 'number' && Number.isInteger(body.orderStatus)
      ? body.orderStatus
      : null;
    if (envelope.success !== true) {
      const invalidToken = envelope.message === 'Invalid Token';
      const terminalStatus = bodyStatus !== null && [4, 5, 9, 10].includes(bodyStatus);
      const result = await finishCallback(serviceClient, callback, {
        verified: false,
        permanent: invalidToken || terminalStatus,
        error: invalidToken
          ? 'Paymento Verify rejected the stored token.'
          : terminalStatus
            ? `Paymento Verify reported terminal order status ${bodyStatus}.`
            : 'Paymento has not approved the payment yet; the stored callback will be retried.',
      });
      if (result?.retry_scheduled) summary.retrying += 1;
      else if (result?.needs_review) summary.needsReview += 1;
      continue;
    }

    const tokenMatches = isPaymentoToken(body?.token) && body.token === callback.payment_token;
    const verifiedOrderId = typeof body?.orderId === 'string' ? body.orderId : null;
    const requestedAmount = typeof body?.settlement?.requestedFiatAmount === 'number'
      && Number.isFinite(body.settlement.requestedFiatAmount)
      ? body.settlement.requestedFiatAmount
      : null;
    const result = await finishCallback(serviceClient, callback, {
      verified: true,
      permanent: true,
      tokenHash: tokenMatches ? await sha256Hex(body!.token as string) : null,
      orderId: verifiedOrderId,
      status: bodyStatus,
      requestedAmount,
      error: tokenMatches && verifiedOrderId && bodyStatus === APPROVED_STATUS && requestedAmount !== null
        ? undefined
        : 'Paymento Verify response is missing a matching token, order, approved status, or requested amount.',
    });
    if (result?.success === true && (result?.processed === true || result?.duplicate === true)) {
      summary.approved += 1;
    } else if (result?.needs_review) {
      summary.needsReview += 1;
    } else if (result?.retry_scheduled) {
      summary.retrying += 1;
    }
  }

  return summary;
}
