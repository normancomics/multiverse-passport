import { defineManifest, ERC721OwnerPredicateClient } from "@opensea/tool-sdk"
import { chainNames } from "./chains.js"

const creatorAddress = "0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7" as const
const gateCollection =
  (process.env.UNRMN_NFT_ADDRESS as `0x${string}` | undefined) ??
  "0x0000000000000000000000000000000000000000"

const access = new ERC721OwnerPredicateClient().toManifestAccess(
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
      : "https://multiverse-passport.example/api/tool"),
  inputs: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description:
          "Optional wallet address. When provided, runs the public overlap check without social resolution.",
      },
      mode: {
        type: "string",
        enum: ["public", "gated"],
        description:
          "Optional explicit mode selector. Use public with address for open checks, or gated without address for the verified caller passport.",
      },
      chain: {
        type: "string",
        enum: chainNames,
        description:
          "Preferred identity chain used to rank domains and explorers in the returned passport.",
      },
      customPassport: {
        type: "object",
        description:
          "Optional custom token-gated passport definition. Supply your own contracts, chains, unlocks, and optional fee metadata.",
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          match: { type: "string", enum: ["all", "any"] },
          gates: {
            type: "array",
            items: {
              type: "object",
              properties: {
                chain: { type: "string", enum: chainNames },
                contractAddress: { type: "string" },
                type: { type: "string", enum: ["erc721", "erc20"] },
                minBalance: { type: "string" },
                label: { type: "string" },
              },
              required: ["chain", "contractAddress", "type"],
            },
          },
          unlocks: { type: "array", items: { type: "string" } },
          feeUsdc: { type: "string" },
        },
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
      customPassportEvaluation: {
        type: ["object", "null"],
        properties: {
          name: { type: "string" },
          match: { type: "string", enum: ["all", "any"] },
          passed: { type: "boolean" },
          unlocks: { type: "array", items: { type: "string" } },
          feeUsdc: { type: ["string", "null"] },
          results: {
            type: "array",
            items: {
              type: "object",
              properties: {
                gate: { type: "object" },
                passed: { type: "boolean" },
                checkedBalance: { type: "string" },
              },
            },
          },
        },
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
      "customPassportEvaluation",
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
