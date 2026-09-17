import {
  createToolHandler,
  predicateGate,
  ToolHandlerError,
} from "@opensea/tool-sdk"
import { getAddress, isAddress } from "viem"
import { z } from "zod/v4"
import { chainNames } from "./chains.js"
import { manifest } from "./manifest.js"
import { recordUsage } from "./monetization.js"
import { buildMultichainPassport, getPreferredChains } from "./multichain.js"
import { getCoreHoldingStatus } from "./onchain.js"

const InputSchema = z.object({
  address: z.string().optional(),
  chain: z.enum(chainNames).optional(),
})

const HoldingsSchema = z
  .object({
    hasUnrmnNft: z.boolean(),
    hasUnrmnToken: z.boolean(),
    hasGoodlumsNft: z.boolean(),
    holdsUnrmn: z.boolean(),
    dualCitizen: z.boolean(),
  })
  .passthrough()

const PassportCardSchema = z.object({}).passthrough()

const OutputSchema = z.object({
  mode: z.enum(["public", "gated"]),
  address: z.string(),
  verifiedCaller: z.string().nullable(),
  dualCitizen: z.boolean(),
  holdings: HoldingsSchema,
  passportCard: PassportCardSchema.nullable(),
  multichainPassport: z.object({}).passthrough().nullable(),
})

const creatorAddress = "0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7" as const
const toolId = process.env.TOOL_ID ? BigInt(process.env.TOOL_ID) : null
const operatorAddress =
  (process.env.OPERATOR_ADDRESS as `0x${string}` | undefined) ?? creatorAddress

const publicHandler = createToolHandler<any, any>({
  manifest,
  inputSchema: InputSchema as any,
  outputSchema: OutputSchema as any,
  handler: async input => {
    const payload = input ?? {}

    if (!payload.address || !isAddress(payload.address)) {
      throw new ToolHandlerError(
        400,
        "Public lookups require a valid wallet address in the address field.",
      )
    }

    const address = getAddress(payload.address)
    const holdings = await getCoreHoldingStatus(address)
    recordUsage({
      chain: payload.chain ?? "base",
      caller: address,
      endpoint: "/api/tool",
      responseType: "public",
      amount: "0",
    })

    return {
      mode: "public",
      address,
      verifiedCaller: null,
      dualCitizen: holdings.dualCitizen,
      holdings,
      passportCard: null,
      multichainPassport: null,
    }
  },
})

const gatedHandler = createToolHandler<any, any>({
  manifest,
  inputSchema: InputSchema as any,
  outputSchema: OutputSchema as any,
  gates: toolId
    ? [
        predicateGate({
          toolId,
          operatorAddress,
          rpcUrl: process.env.RPC_URL ?? process.env.BASE_RPC_URL,
        }),
      ]
    : [],
  handler: async (input, ctx) => {
    const payload = input ?? {}

    if (!toolId) {
      throw new ToolHandlerError(
        503,
        "Gated mode is not configured yet. Set TOOL_ID after OpenSea registration.",
      )
    }

    if (!ctx.callerAddress || !isAddress(ctx.callerAddress)) {
      throw new ToolHandlerError(
        401,
        "Verified caller signature required for the full passport.",
      )
    }

    const address = getAddress(ctx.callerAddress)
    const preferredChains = getPreferredChains(payload.chain ?? null)
    const passport = await buildMultichainPassport(address, preferredChains)

    return {
      mode: "gated",
      address,
      verifiedCaller: address,
      dualCitizen: passport.dualCitizen,
      holdings: passport.holdings,
      passportCard: passport.passportCard,
      multichainPassport: passport,
    }
  },
})

export const toolHandler = async (request: Request) => {
  let body: { address?: unknown } = {}
  try {
    body = (await request.clone().json()) as { address?: unknown }
  } catch {
    body = {}
  }

  const isPublicLookup = typeof body.address === "string" && body.address.length > 0
  return isPublicLookup ? publicHandler(request) : gatedHandler(request)
}
