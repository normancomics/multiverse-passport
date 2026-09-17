import {
  createToolHandler,
  predicateGate,
  ToolHandlerError,
} from "@opensea/tool-sdk"
import { getAddress, isAddress } from "viem"
import { z } from "zod/v4"
import { base } from "viem/chains"
import { chainNames } from "./chains.js"
import { manifest } from "./manifest.js"
import { recordUsage } from "./monetization.js"
import { buildMultichainPassport, getPreferredChains } from "./multichain.js"
import { getCoreHoldingStatus } from "./onchain.js"

const InputSchema = z.object({
  address: z.string().optional(),
  chain: z.enum(chainNames).optional(),
})

const HoldingsSchema = z.object({
  hasUnrmnNft: z.boolean(),
  hasUnrmnToken: z.boolean(),
  hasGoodlumsNft: z.boolean(),
  holdsUnrmn: z.boolean(),
  dualCitizen: z.boolean(),
})

const PassportCardSchema = z.object({
  title: z.string(),
  status: z.enum(["dual-citizen", "single-citizen", "visitor"]),
  tier: z.enum(["dual-citizen", "resident", "visitor"]),
  summary: z.string(),
  verifiedHandles: z.object({
    x: z.string().nullable(),
    farcaster: z.string().nullable(),
    ens: z.string().nullable(),
    displayName: z.string().nullable(),
  }),
  rewards: z.array(z.string()),
})

const ExplorerDataSchema = z.object({
  chain: z.enum(chainNames),
  explorerUrl: z.string(),
  addressUrl: z.string(),
  nativeBalance: z.string().nullable(),
  transactions: z.number().nullable(),
  contractsDeployed: z.number().nullable(),
  tokenBalances: z.array(
    z.object({
      contract: z.string(),
      symbol: z.string().nullable(),
      balance: z.string(),
    }),
  ),
})

const DomainSchema = z.object({
  chain: z.enum(chainNames),
  domains: z.array(
    z.object({
      service: z.string(),
      domain: z.string(),
      type: z.enum(["official", "community"]),
      status: z.enum(["official", "established", "emerging"]),
      explorerUrl: z.string().optional(),
    }),
  ),
  primaryDomain: z.string().nullable(),
  services: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["official", "community"]),
      tlds: z.array(z.string()),
      explorerBaseUrl: z.string().optional(),
      lookupUrlTemplate: z.string().optional(),
      status: z.enum(["official", "established", "emerging"]),
    }),
  ),
  explorerUrls: z.array(z.string()),
})

const OutputSchema = z.object({
  mode: z.enum(["public", "gated"]),
  address: z.string(),
  verifiedCaller: z.string().nullable(),
  dualCitizen: z.boolean(),
  holdings: HoldingsSchema,
  passportCard: PassportCardSchema.nullable(),
  multichainPassport: z
    .object({
      address: z.string(),
      dualCitizen: z.boolean(),
      holdings: HoldingsSchema.extend({ chain: z.enum(chainNames) }),
      holdingsByChain: z.array(HoldingsSchema.extend({ chain: z.enum(chainNames) })),
      primaryIdentity: z.string().nullable(),
      domains: z.array(DomainSchema),
      social: z.object({
        twitter: z.string().nullable(),
        farcaster: z.string().nullable(),
        ens: z.string().nullable(),
        displayName: z.string().nullable(),
        avatar: z.string().nullable(),
        links: z.array(z.string()),
      }),
      explorers: z.array(ExplorerDataSchema),
      passportCard: PassportCardSchema,
      revenue: z.array(
        z.object({
          chain: z.union([z.enum(chainNames), z.literal("unknown")]),
          caller: z.string().nullable(),
          endpoint: z.string(),
          timestamp: z.string(),
          responseType: z.enum(["public", "gated"]),
          amount: z.string(),
          recipient: z.string(),
        }),
      ),
    })
    .nullable(),
})

const creatorAddress = "0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7" as const
const toolId = process.env.TOOL_ID ? BigInt(process.env.TOOL_ID) : null
const operatorAddress =
  (process.env.OPERATOR_ADDRESS as `0x${string}` | undefined) ?? creatorAddress

const publicHandler = createToolHandler({
  manifest,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  handler: async input => {
    if (!input.address || !isAddress(input.address)) {
      throw new ToolHandlerError(
        400,
        "Public lookups require a valid wallet address in the address field.",
      )
    }

    const address = getAddress(input.address)
    const holdings = await getCoreHoldingStatus(address)
    recordUsage({
      chain: input.chain ?? "base",
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

const gatedHandler = createToolHandler({
  manifest,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  gates: toolId
    ? [
        predicateGate({
          toolId,
          operatorAddress,
          chain: base,
          rpcUrl: process.env.RPC_URL ?? process.env.BASE_RPC_URL,
        }),
      ]
    : [],
  handler: async (_input, ctx) => {
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
    const preferredChains = getPreferredChains(_input.chain ?? null)
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
