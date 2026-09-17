import {
  createToolHandler,
  defineManifest,
  ERC721OwnerPredicateClient,
  predicateGate,
} from "@opensea/tool-sdk"
import { z } from "zod/v4"
import { base } from "viem/chains"
import { chainNames } from "./chains.js"

const creatorAddress = "0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7" as const
const gateCollection =
  (process.env.UNRMN_NFT_ADDRESS as `0x${string}` | undefined) ??
  "0x0000000000000000000000000000000000000000"

const access = new ERC721OwnerPredicateClient({ chain: base }).toManifestAccess(
  gateCollection,
  {
    label: "Hold a uNRMN/uNORMANCOMICS NFT to unlock the full verified passport",
  },
)

export const manifest = defineManifest({
  type: "https://ercs.ethereum.org/ERCS/erc-8257#tool-manifest-v1",
  name: "multiverse-passport",
  description:
    "Checks uNRMN/uNORMANCOMICS and thegoodlums overlap, offers a public membership check for any address, and returns a full verified social passport for the authenticated caller.",
  endpoint:
    process.env.TOOL_ENDPOINT ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}/api/tool`
      : "http://localhost:3000/api/tool"),
  inputs: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description:
          "Optional wallet address. When provided, runs the public overlap check without social resolution.",
      },
      chain: {
        type: "string",
        enum: chainNames,
        description:
          "Preferred identity chain used to rank domains and explorers in the returned passport.",
      },
    },
  },
  outputs: {
    type: "object",
    properties: {
      mode: { type: "string", enum: ["public", "gated"] },
      address: { type: "string" },
      verifiedCaller: { type: ["string", "null"] },
      dualCitizen: { type: "boolean" },
      holdings: {
        type: "object",
        properties: {
          hasUnrmnNft: { type: "boolean" },
          hasUnrmnToken: { type: "boolean" },
          hasGoodlumsNft: { type: "boolean" },
          holdsUnrmn: { type: "boolean" },
          dualCitizen: { type: "boolean" },
        },
        required: [
          "hasUnrmnNft",
          "hasUnrmnToken",
          "hasGoodlumsNft",
          "holdsUnrmn",
          "dualCitizen",
        ],
      },
      passportCard: {
        type: ["object", "null"],
        properties: {
          title: { type: "string" },
          status: { type: "string" },
          tier: { type: "string" },
          summary: { type: "string" },
          verifiedHandles: { type: "object" },
          rewards: { type: "array", items: { type: "string" } },
        },
      },
      multichainPassport: { type: ["object", "null"] },
    },
    required: [
      "mode",
      "address",
      "verifiedCaller",
      "dualCitizen",
      "holdings",
      "passportCard",
      "multichainPassport",
    ],
  },
  creatorAddress,
  pricing: [],
  access,
  tags: [
    "opensea",
    "erc-8257",
    "identity",
    "multichain",
    "nft-gating",
    "passport",
  ],
})

export const manifestCheckHandler = createToolHandler({
  manifest,
  inputSchema: z.object({}).passthrough(),
  outputSchema: z.object({ ok: z.boolean() }),
  gates: [
    predicateGate({
      toolId: BigInt(process.env.TOOL_ID ?? "0"),
      operatorAddress:
        (process.env.OPERATOR_ADDRESS as `0x${string}` | undefined) ?? creatorAddress,
      chain: base,
      rpcUrl: process.env.RPC_URL ?? process.env.BASE_RPC_URL,
    }),
  ],
  handler: async () => ({ ok: true }),
})
