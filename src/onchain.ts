import {
  createPublicClient,
  erc20Abi,
  getAddress,
  http,
  type Address,
} from "viem"
import { getChainByName } from "./chains.js"
import type {
  ChainName,
  CustomPassportConfig,
  CustomPassportEvaluation,
  CustomPassportGate,
  CustomPassportGateResult,
} from "./types.js"

const zeroAddress = "0x0000000000000000000000000000000000000000" as const

const erc721Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const

const clientCache = new Map<string, any>()

const envAddress = (name: string) => {
  const value = process.env[name]
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? getAddress(value) : zeroAddress
}

function getClient(chainName: ChainName = "base") {
  const cacheKey = chainName
  const cached = clientCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const chain = getChainByName(chainName)
  if (!chain?.rpcUrl) {
    throw new Error(`Missing RPC configuration for ${chainName}`)
  }

  const client = createPublicClient({
    chain: chain.viemChain as never,
    transport: http(chain.rpcUrl),
  })
  clientCache.set(cacheKey, client)
  return client
}

async function readBalance(
  owner: Address,
  contract: Address,
  chainName: ChainName,
  type: "erc721" | "erc20",
) {
  if (contract === zeroAddress) {
    return 0n
  }

  try {
    const client = getClient(chainName)
    const balance = await client.readContract({
      address: contract,
      abi: type === "erc721" ? erc721Abi : erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })

    return balance
  } catch {
    return 0n
  }
}

export async function hasErc721Balance(
  owner: Address,
  contract: Address,
  chainName: ChainName = "base",
) {
  return (await readBalance(owner, contract, chainName, "erc721")) > 0n
}

export async function hasErc20Balance(
  owner: Address,
  contract: Address,
  chainName: ChainName = "base",
) {
  return (await readBalance(owner, contract, chainName, "erc20")) > 0n
}

export async function holdsUnrmn(owner: Address) {
  const [hasNft, hasToken] = await Promise.all([
    hasErc721Balance(owner, envAddress("UNRMN_NFT_ADDRESS"), "base"),
    hasErc20Balance(owner, envAddress("UNRMN_TOKEN_ADDRESS"), "base"),
  ])

  return hasNft || hasToken
}

export async function holdsGoodlums(owner: Address) {
  return hasErc721Balance(owner, envAddress("GOODLUMS_NFT_ADDRESS"), "base")
}

export async function getCoreHoldingStatus(owner: Address) {
  const [hasUnrmnNft, hasUnrmnToken, hasGoodlumsNft] = await Promise.all([
    hasErc721Balance(owner, envAddress("UNRMN_NFT_ADDRESS"), "base"),
    hasErc20Balance(owner, envAddress("UNRMN_TOKEN_ADDRESS"), "base"),
    hasErc721Balance(owner, envAddress("GOODLUMS_NFT_ADDRESS"), "base"),
  ])

  const hasUnrmn = hasUnrmnNft || hasUnrmnToken

  return {
    hasUnrmnNft,
    hasUnrmnToken,
    hasGoodlumsNft,
    holdsUnrmn: hasUnrmn,
    dualCitizen: hasUnrmn && hasGoodlumsNft,
  }
}

async function evaluateCustomGate(
  owner: Address,
  gate: CustomPassportGate,
): Promise<CustomPassportGateResult> {
  const normalized = getAddress(gate.contractAddress)
  const balance = await readBalance(owner, normalized, gate.chain, gate.type)
  const minimum = BigInt(gate.minBalance ?? "1")

  return {
    gate: {
      ...gate,
      contractAddress: normalized,
    },
    passed: balance >= minimum,
    checkedBalance: balance.toString(),
  }
}

export async function evaluateCustomPassport(
  owner: Address,
  config?: CustomPassportConfig,
): Promise<CustomPassportEvaluation | null> {
  if (!config || config.gates.length === 0) {
    return null
  }

  const results = await Promise.all(config.gates.map(gate => evaluateCustomGate(owner, gate)))
  const match = config.match ?? "all"
  const passed =
    match === "all"
      ? results.every(result => result.passed)
      : results.some(result => result.passed)

  return {
    name: config.name?.trim() || "Custom Passport",
    match,
    passed,
    unlocks: passed ? config.unlocks ?? [] : [],
    feeUsdc: config.feeUsdc ?? null,
    results,
  }
}
