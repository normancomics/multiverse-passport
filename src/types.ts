import type { Address } from "viem"

export type ChainName =
  | "ethereum"
  | "base"
  | "robinhood"
  | "arbitrum"
  | "optimism"
  | "arc"
  | "hyperliquid"

export type AssetType = "erc721" | "erc20"

export interface DomainService {
  name: string
  type: "official" | "community"
  tlds: string[]
  explorerBaseUrl?: string
  lookupUrlTemplate?: string
  status: "official" | "established" | "emerging"
}

export interface ChainConfig {
  id: number
  name: ChainName
  displayName: string
  viemChain: unknown
  rpcUrl?: string
  explorerBaseUrl: string
  explorerApiBaseUrl?: string
  explorerApiKind?: "etherscan" | "blockscout"
  nativeDomainService: string
  domainServices: DomainService[]
}

export interface ResolvedDomain {
  service: string
  domain: string
  type: DomainService["type"]
  status: DomainService["status"]
  explorerUrl?: string
}

export interface DomainResolution {
  chain: ChainName
  domains: ResolvedDomain[]
  primaryDomain: string | null
  services: DomainService[]
  explorerUrls: string[]
}

export interface Web3BioProfile {
  platform: string
  identity: string
  address?: string
  displayName?: string | null
  avatar?: string | null
  links?: string[]
}

export interface SocialIdentitySummary {
  twitter: string | null
  farcaster: string | null
  ens: string | null
  displayName: string | null
  avatar: string | null
  links: string[]
}

export interface ExplorerTokenBalance {
  contract: Address | string
  symbol: string | null
  balance: string
}

export interface ExplorerData {
  chain: ChainName
  explorerUrl: string
  addressUrl: string
  nativeBalance: string | null
  transactions: number | null
  contractsDeployed: number | null
  tokenBalances: ExplorerTokenBalance[]
}

export interface HoldingStatus {
  chain: ChainName
  hasUnrmnNft: boolean
  hasUnrmnToken: boolean
  hasGoodlumsNft: boolean
  holdsUnrmn: boolean
  dualCitizen: boolean
}

export interface PassportCard {
  title: string
  status: "dual-citizen" | "single-citizen" | "visitor"
  tier: Tier
  summary: string
  verifiedHandles: {
    x: string | null
    farcaster: string | null
    ens: string | null
    displayName: string | null
  }
  rewards: string[]
}

export type Tier = "dual-citizen" | "resident" | "visitor"

export interface CustomPassportGate {
  chain: ChainName
  contractAddress: Address
  type: AssetType
  minBalance?: string
  label?: string
}

export interface CustomPassportConfig {
  name?: string
  description?: string
  match?: "all" | "any"
  gates: CustomPassportGate[]
  unlocks?: string[]
  feeUsdc?: string
}

export interface CustomPassportGateResult {
  gate: CustomPassportGate
  passed: boolean
  checkedBalance: string
}

export interface CustomPassportEvaluation {
  name: string
  match: "all" | "any"
  passed: boolean
  unlocks: string[]
  feeUsdc: string | null
  results: CustomPassportGateResult[]
}

export interface RevenueRecord {
  chain: ChainName | "unknown"
  caller: Address | string | null
  endpoint: string
  timestamp: string
  responseType: "public" | "gated"
  amount: string
  recipient: Address | string
}

export interface MultichainPassport {
  address: Address
  dualCitizen: boolean
  holdings: HoldingStatus
  holdingsByChain: HoldingStatus[]
  primaryIdentity: string | null
  domains: DomainResolution[]
  social: SocialIdentitySummary
  explorers: ExplorerData[]
  passportCard: PassportCard
  customPassportEvaluation: CustomPassportEvaluation | null
  revenue: RevenueRecord[]
}
