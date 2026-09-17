import { getAddress, type Address } from "viem"
import { chainConfig, getChainByName } from "./chains.js"
import { resolveDomainsForAllChains } from "./domains.js"
import { getExplorerDataForChains } from "./explorers.js"
import { recordPayment, getRevenueSnapshot } from "./monetization.js"
import { getCoreHoldingStatus } from "./onchain.js"
import type { ChainName, HoldingStatus, MultichainPassport, PassportCard, Tier } from "./types.js"
import { resolveWeb3BioProfile, summarizeIdentity } from "./web3bio.js"

function buildTier(dualCitizen: boolean, holdsUnrmn: boolean): Tier {
  if (dualCitizen) {
    return "dual-citizen"
  }
  if (holdsUnrmn) {
    return "resident"
  }
  return "visitor"
}

function buildPassportCard(params: {
  dualCitizen: boolean
  holdsUnrmn: boolean
  social: ReturnType<typeof summarizeIdentity>
}): PassportCard {
  const tier = buildTier(params.dualCitizen, params.holdsUnrmn)
  const status =
    tier === "dual-citizen"
      ? "dual-citizen"
      : tier === "resident"
        ? "single-citizen"
        : "visitor"

  return {
    title: "Multiverse Passport",
    status,
    tier,
    summary:
      tier === "dual-citizen"
        ? "Verified dual citizen with both uNRMN/uNORMANCOMICS and thegoodlums access."
        : tier === "resident"
          ? "Verified uNRMN/uNORMANCOMICS holder awaiting thegoodlums overlap."
          : "Wallet checked successfully but does not currently satisfy dual-citizen requirements.",
    verifiedHandles: {
      x: params.social.twitter,
      farcaster: params.social.farcaster,
      ens: params.social.ens,
      displayName: params.social.displayName,
    },
    rewards:
      tier === "dual-citizen"
        ? [
            "Eligible for specialized chats",
            "Eligible for bonus NFT campaigns",
            "Eligible for hierarchy-based community rewards",
          ]
        : tier === "resident"
          ? ["Track progress toward dual-citizen status"]
          : ["Public overlap check only"],
  }
}

export async function checkNftHoldings(address: Address, chains: ChainName[]) {
  const normalized = getAddress(address)
  const core = await getCoreHoldingStatus(normalized)

  return chains.map(
    chain =>
      ({
        chain,
        ...core,
      }) satisfies HoldingStatus,
  )
}

export async function resolvePrimaryIdentity(
  address: Address,
  preferredChains: ChainName[],
) {
  const profiles = await resolveWeb3BioProfile(address)
  const domains = await resolveDomainsForAllChains(address, profiles)
  const ordered = preferredChains
    .map(chain => domains.find(entry => entry.chain === chain))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  return ordered.find(entry => entry.primaryDomain)?.primaryDomain ??
    domains.find(entry => entry.primaryDomain)?.primaryDomain ??
    summarizeIdentity(profiles).ens ??
    null
}

export async function buildMultichainPassport(
  address: Address,
  preferredChains: ChainName[] = chainConfig.map(chain => chain.name),
): Promise<MultichainPassport> {
  const normalized = getAddress(address)
  const [profiles, holdingsByChain, explorers] = await Promise.all([
    resolveWeb3BioProfile(normalized),
    checkNftHoldings(normalized, preferredChains),
    getExplorerDataForChains(normalized, preferredChains),
  ])

  const social = summarizeIdentity(profiles)
  const domains = await resolveDomainsForAllChains(normalized, profiles)
  const holdings = holdingsByChain[0] ?? {
    chain: preferredChains[0] ?? "base",
    ...(await getCoreHoldingStatus(normalized)),
  }
  const passportCard = buildPassportCard({
    dualCitizen: holdings.dualCitizen,
    holdsUnrmn: holdings.holdsUnrmn,
    social,
  })

  recordPayment({
    chain: preferredChains[0] ?? "base",
    caller: normalized,
    endpoint: "/api/tool",
    amount: "0",
  })

  return {
    address: normalized,
    dualCitizen: holdings.dualCitizen,
    holdings,
    holdingsByChain,
    primaryIdentity:
      domains.find(domain => preferredChains.includes(domain.chain) && domain.primaryDomain)
        ?.primaryDomain ?? social.ens,
    domains,
    social,
    explorers,
    passportCard,
    revenue: getRevenueSnapshot(normalized),
  }
}

export function getPreferredChains(selected?: ChainName | null) {
  if (!selected) {
    return chainConfig.map(chain => chain.name)
  }

  const picked = getChainByName(selected)
  if (!picked) {
    return chainConfig.map(chain => chain.name)
  }

  return [picked.name, ...chainConfig.filter(chain => chain.name !== picked.name).map(chain => chain.name)]
}
