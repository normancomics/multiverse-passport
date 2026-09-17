import type { Address } from "viem"
import type { ChainName, RevenueRecord } from "./types.js"

const usageLedger: RevenueRecord[] = []

const usdcRecipient =
  (process.env.USDC_RECIPIENT_ADDRESS as Address | undefined) ??
  "0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7"

export function getUsdcAddress(chain: ChainName) {
  switch (chain) {
    case "ethereum":
      return process.env.ETH_USDC_ADDRESS ?? null
    case "base":
      return process.env.BASE_USDC_ADDRESS ?? null
    case "arbitrum":
      return process.env.ARBITRUM_USDC_ADDRESS ?? null
    case "optimism":
      return process.env.OPTIMISM_USDC_ADDRESS ?? null
    case "robinhood":
      return process.env.ROBINHOOD_USDC_ADDRESS ?? null
    case "arc":
      return process.env.ARC_USDC_ADDRESS ?? null
    case "hyperliquid":
      return process.env.HYPERLIQUID_USDC_ADDRESS ?? null
  }
}

export function recordUsage(params: {
  chain: ChainName | "unknown"
  caller: Address | string | null
  endpoint: string
  responseType: "public" | "gated"
  amount?: string
}) {
  const record: RevenueRecord = {
    chain: params.chain,
    caller: params.caller,
    endpoint: params.endpoint,
    timestamp: new Date().toISOString(),
    responseType: params.responseType,
    amount: params.amount ?? "0",
    recipient: usdcRecipient,
  }

  usageLedger.push(record)
  console.info("multiverse-passport-usage", record)
  return record
}

export function recordPayment(params: {
  chain: ChainName
  caller: Address | string | null
  endpoint: string
  amount: string
}) {
  return recordUsage({
    chain: params.chain,
    caller: params.caller,
    endpoint: params.endpoint,
    responseType: "gated",
    amount: params.amount,
  })
}

export function getRevenueSnapshot(caller?: Address | string | null) {
  return caller ? usageLedger.filter(record => record.caller === caller) : [...usageLedger]
}
