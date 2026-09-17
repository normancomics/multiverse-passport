import { createPublicClient, erc20Abi, getAddress, http, type Address } from "viem"
import { base } from "viem/chains"

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

const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_URL ?? process.env.BASE_RPC_URL ?? "https://mainnet.base.org"),
})

const envAddress = (name: string) => {
  const value = process.env[name]
  return value && /^0x[a-fA-F0-9]{40}$/.test(value) ? getAddress(value) : zeroAddress
}

export async function hasErc721Balance(owner: Address, contract: Address) {
  if (contract === zeroAddress) {
    return false
  }

  try {
    const balance = await baseClient.readContract({
      address: contract,
      abi: erc721Abi,
      functionName: "balanceOf",
      args: [owner],
    })

    return balance > 0n
  } catch {
    return false
  }
}

export async function hasErc20Balance(owner: Address, contract: Address) {
  if (contract === zeroAddress) {
    return false
  }

  try {
    const balance = await baseClient.readContract({
      address: contract,
      abi: erc20Abi,
      functionName: "balanceOf",
      args: [owner],
    })

    return balance > 0n
  } catch {
    return false
  }
}

export async function holdsUnrmn(owner: Address) {
  const [hasNft, hasToken] = await Promise.all([
    hasErc721Balance(owner, envAddress("UNRMN_NFT_ADDRESS")),
    hasErc20Balance(owner, envAddress("UNRMN_TOKEN_ADDRESS")),
  ])

  return hasNft || hasToken
}

export async function holdsGoodlums(owner: Address) {
  return hasErc721Balance(owner, envAddress("GOODLUMS_NFT_ADDRESS"))
}

export async function getCoreHoldingStatus(owner: Address) {
  const [hasUnrmnNft, hasUnrmnToken, hasGoodlumsNft] = await Promise.all([
    hasErc721Balance(owner, envAddress("UNRMN_NFT_ADDRESS")),
    hasErc20Balance(owner, envAddress("UNRMN_TOKEN_ADDRESS")),
    hasErc721Balance(owner, envAddress("GOODLUMS_NFT_ADDRESS")),
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
