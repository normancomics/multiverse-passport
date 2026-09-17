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
import { evaluateCustomPassport, getCoreHoldingStatus } from "./onchain.js"

const InputSchema = z.object({
  address: z.string().optional(),
  mode: z.enum(["public", "gated"]).optional(),
  chain: z.enum(chainNames).optional(),
  customPassport: z
    .object({
      name: z.string().optional(),
      description: z.string().optional(),
      match: z.enum(["all", "any"]).optional(),
      gates: z.array(
        z.object({
          chain: z.enum(chainNames),
          contractAddress: z.string(),
          type: z.enum(["erc721", "erc20"]),
          minBalance: z.string().regex(/^[0-9]+$/).optional(),
          label: z.string().optional(),
        }),
      ),
      unlocks: z.array(z.string()).optional(),
      feeUsdc: z.string().optional(),
    })
    .optional(),
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
  customPassportEvaluation: z.object({}).passthrough().nullable(),
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
    if (payload.mode === "gated") {
      throw new ToolHandlerError(
        400,
        "Public handler cannot be used with mode=gated.",
      )
    }

    if (!payload.address || !isAddress(payload.address)) {
      throw new ToolHandlerError(
        400,
        "Public lookups require a valid wallet address in the address field.",
      )
    }

    const address = getAddress(payload.address)
    const [holdings, customPassportEvaluation] = await Promise.all([
      getCoreHoldingStatus(address),
      evaluateCustomPassport(address, payload.customPassport),
    ])
    recordUsage({
      chain: payload.chain ?? "base",
      caller: address,
      endpoint: "/api/tool",
      responseType: "public",
      amount: payload.customPassport?.feeUsdc ?? "0",
    })

    return {
      mode: "public",
      address,
      verifiedCaller: null,
      dualCitizen: holdings.dualCitizen,
      holdings,
      customPassportEvaluation,
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
    if (payload.address) {
      throw new ToolHandlerError(
        400,
        "Gated mode resolves the verified caller only. Remove address or use mode=public.",
      )
    }

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
    const passport = await buildMultichainPassport(
      address,
      preferredChains,
      payload.customPassport,
    )

    return {
      mode: "gated",
      address,
      verifiedCaller: address,
      dualCitizen: passport.dualCitizen,
      holdings: passport.holdings,
      customPassportEvaluation: passport.customPassportEvaluation,
      passportCard: passport.passportCard,
      multichainPassport: passport,
    }
  },
})

export const toolHandler = async (request: Request) => {
  let body: { address?: unknown; mode?: unknown } = {}
  try {
    body = (await request.clone().json()) as { address?: unknown; mode?: unknown }
  } catch {
    body = {}
  }

  const explicitMode = body.mode === "public" || body.mode === "gated" ? body.mode : null
  const isPublicLookup =
    explicitMode === "public" ||
    (explicitMode !== "gated" &&
      typeof body.address === "string" &&
      body.address.length > 0)
  return isPublicLookup ? publicHandler(request) : gatedHandler(request)
}
