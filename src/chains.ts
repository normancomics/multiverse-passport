import { defineChain } from "viem"
import { arbitrum, base, mainnet, optimism } from "viem/chains"
import type { ChainConfig, ChainName } from "./types.js"

const parseChainId = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

const robinhood = defineChain({
  id: parseChainId(process.env.ROBINHOOD_CHAIN_ID, 4663),
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ROBINHOOD_RPC_URL ?? "https://rpc.robinhoodchain.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Chain Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
})

const arc = defineChain({
  id: parseChainId(process.env.ARC_CHAIN_ID, 424242),
  name: "Arc",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.ARC_RPC_URL ?? "https://rpc.arc.example"] },
  },
  blockExplorers: {
    default: {
      name: "Arc Explorer",
      url: "https://explorer.arc.community",
    },
  },
})

const hyperliquid = defineChain({
  id: parseChainId(process.env.HYPERLIQUID_CHAIN_ID, 999),
  name: "Hyperliquid EVM",
  nativeCurrency: { name: "HYPE", symbol: "HYPE", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.HYPERLIQUID_RPC_URL ?? "https://rpc.hyperliquid.xyz/evm"] },
  },
  blockExplorers: {
    default: {
      name: "Hyperliquid Explorer",
      url: "https://explorer.hyperliquid.xyz/evm",
    },
  },
})

export const chainConfig: ChainConfig[] = [
  {
    id: mainnet.id,
    name: "ethereum",
    displayName: "Ethereum",
    viemChain: mainnet,
    rpcUrl: process.env.ETHEREUM_RPC_URL,
    explorerBaseUrl: "https://etherscan.io",
    nativeDomainService: "ENS",
    domainServices: [
      {
        name: "ENS",
        type: "official",
        tlds: [".eth"],
        explorerBaseUrl: "https://app.ens.domains",
        status: "official",
      },
    ],
  },
  {
    id: base.id,
    name: "base",
    displayName: "Base",
    viemChain: base,
    rpcUrl: process.env.BASE_RPC_URL ?? process.env.RPC_URL,
    explorerBaseUrl: "https://basescan.org",
    nativeDomainService: "Basenames",
    domainServices: [
      {
        name: "Basenames",
        type: "official",
        tlds: [".base.eth"],
        explorerBaseUrl: "https://www.base.org/names",
        status: "official",
      },
    ],
  },
  {
    id: robinhood.id,
    name: "robinhood",
    displayName: "Robinhood Chain",
    viemChain: robinhood,
    rpcUrl: process.env.ROBINHOOD_RPC_URL,
    explorerBaseUrl: "https://robinhoodchain.blockscout.com",
    explorerApiBaseUrl: "https://robinhoodchain.blockscout.com/api/v2",
    explorerApiKind: "blockscout",
    nativeDomainService: "HoodDomains",
    domainServices: [
      {
        name: "HoodDomains",
        type: "community",
        tlds: [".hood", ".rh"],
        explorerBaseUrl: "https://hooddomains.xyz",
        status: "established",
      },
      {
        name: "rns.gg",
        type: "community",
        tlds: [".rns"],
        explorerBaseUrl: "https://rns.gg",
        status: "emerging",
      },
      {
        name: "robinhoodns.xyz",
        type: "community",
        tlds: [".robin"],
        explorerBaseUrl: "https://robinhoodns.xyz",
        status: "emerging",
      },
    ],
  },
  {
    id: arbitrum.id,
    name: "arbitrum",
    displayName: "Arbitrum",
    viemChain: arbitrum,
    rpcUrl: process.env.ARBITRUM_RPC_URL,
    explorerBaseUrl: "https://arbiscan.io",
    nativeDomainService: ".arb Name Service",
    domainServices: [
      {
        name: "SPACE ID .arb",
        type: "community",
        tlds: [".arb"],
        explorerBaseUrl: "https://arbiscan.io",
        status: "established",
      },
    ],
  },
  {
    id: optimism.id,
    name: "optimism",
    displayName: "Optimism",
    viemChain: optimism,
    rpcUrl: process.env.OPTIMISM_RPC_URL,
    explorerBaseUrl: "https://optimistic.etherscan.io",
    nativeDomainService: "OPNS",
    domainServices: [
      {
        name: "OPNS",
        type: "community",
        tlds: [".op"],
        explorerBaseUrl: "https://opns.domains",
        status: "established",
      },
      {
        name: "ONS",
        type: "community",
        tlds: [".optimism"],
        explorerBaseUrl: "https://opnames.domains",
        status: "emerging",
      },
      {
        name: "Optimistic Domains",
        type: "community",
        tlds: [".optimistic"],
        explorerBaseUrl: "https://optimistic.domains",
        status: "emerging",
      },
    ],
  },
  {
    id: arc.id,
    name: "arc",
    displayName: "Arc",
    viemChain: arc,
    rpcUrl: process.env.ARC_RPC_URL,
    explorerBaseUrl: "https://explorer.arc.community",
    nativeDomainService: "ArcNS",
    domainServices: [
      {
        name: "ArcNS",
        type: "community",
        tlds: [".arc"],
        explorerBaseUrl: "https://arcns.xyz",
        status: "emerging",
      },
      {
        name: "Orixa",
        type: "community",
        tlds: [".orixa"],
        explorerBaseUrl: "https://orixa.xyz",
        status: "emerging",
      },
      {
        name: "ArcName",
        type: "community",
        tlds: [".arcname"],
        explorerBaseUrl: "https://arcname.xyz",
        status: "emerging",
      },
    ],
  },
  {
    id: hyperliquid.id,
    name: "hyperliquid",
    displayName: "Hyperliquid",
    viemChain: hyperliquid,
    rpcUrl: process.env.HYPERLIQUID_RPC_URL,
    explorerBaseUrl: "https://explorer.hyperliquid.xyz/evm",
    nativeDomainService: "Hyperliquid Names",
    domainServices: [
      {
        name: "Hyperliquid Names",
        type: "community",
        tlds: [".hl"],
        explorerBaseUrl: "https://hlnames.xyz",
        status: "established",
      },
    ],
  },
]

export const chainNames = chainConfig.map(chain => chain.name) as [
  ChainName,
  ...ChainName[],
]

export function getChainByName(name: ChainName | string) {
  return chainConfig.find(chain => chain.name === name)
}

export function getChainById(id: number) {
  return chainConfig.find(chain => chain.id === id)
}
