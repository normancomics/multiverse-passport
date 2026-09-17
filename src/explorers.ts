import { createPublicClient, formatEther, http, type Address } from "viem"
import { chainConfig, getChainByName } from "./chains.js"
import type { ChainName, ExplorerData, ExplorerTokenBalance } from "./types.js"

const blankExplorerData = (chain: ChainName, address: Address, explorerUrl: string): ExplorerData => ({
  chain,
  explorerUrl,
  addressUrl: `${explorerUrl}/address/${address}`,
  nativeBalance: null,
  transactions: null,
  contractsDeployed: null,
  tokenBalances: [],
})

async function getNativeBalance(chainName: ChainName, address: Address) {
  const config = getChainByName(chainName)
  if (!config?.rpcUrl) {
    return null
  }

  try {
    const client = createPublicClient({
      chain: config.viemChain as never,
      transport: http(config.rpcUrl),
    })
    const balance = await client.getBalance({ address })
    return formatEther(balance)
  } catch {
    return null
  }
}

async function fetchExplorerEnvelope(
  url: string,
): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      return null
    }
    return (await response.json()) as Record<string, unknown>
  } catch {
    return null
  }
}

function parseTokenBalances(payload: Record<string, unknown> | null): ExplorerTokenBalance[] {
  const items = Array.isArray(payload?.tokens)
    ? payload.tokens
    : Array.isArray(payload?.token_balances)
      ? payload.token_balances
      : []

  return items
    .map(item => {
      if (!item || typeof item !== "object") {
        return null
      }
      const record = item as Record<string, unknown>
      const contract = typeof record.token_address === "string"
        ? record.token_address
        : typeof record.contract_address === "string"
          ? record.contract_address
          : null
      const balance = typeof record.value === "string"
        ? record.value
        : typeof record.balance === "string"
          ? record.balance
          : null

      if (!contract || !balance) {
        return null
      }

      return {
        contract,
        symbol: typeof record.symbol === "string" ? record.symbol : null,
        balance,
      }
    })
    .filter((item): item is ExplorerTokenBalance => Boolean(item))
}

export async function getExplorerData(
  address: Address,
  chainName: ChainName,
): Promise<ExplorerData> {
  const config = getChainByName(chainName)
  if (!config) {
    throw new Error(`Unsupported chain: ${chainName}`)
  }

  const baseData = blankExplorerData(chainName, address, config.explorerBaseUrl)
  const nativeBalance = await getNativeBalance(chainName, address)

  if (!config.explorerApiBaseUrl) {
    return { ...baseData, nativeBalance }
  }

  const [summary, tokenBalances] = await Promise.all([
    fetchExplorerEnvelope(`${config.explorerApiBaseUrl}/addresses/${address}`),
    fetchExplorerEnvelope(`${config.explorerApiBaseUrl}/addresses/${address}/token-balances`),
  ])

  return {
    ...baseData,
    nativeBalance,
    transactions:
      typeof summary?.txs_count === "number"
        ? summary.txs_count
        : typeof summary?.transactions_count === "number"
          ? summary.transactions_count
          : null,
    contractsDeployed:
      typeof summary?.token_transfers_count === "number"
        ? summary.token_transfers_count
        : null,
    tokenBalances: parseTokenBalances(tokenBalances),
  }
}

export async function getExplorerDataForChains(address: Address, chains = chainConfig.map(chain => chain.name)) {
  return Promise.all(chains.map(chain => getExplorerData(address, chain)))
}
