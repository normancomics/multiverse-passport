import { createPublicClient, http, type Address } from "viem"
import { mainnet } from "viem/chains"
import { chainConfig, getChainByName } from "./chains.js"
import type { ChainName, DomainResolution, ResolvedDomain, Web3BioProfile } from "./types.js"
import { resolveWeb3BioProfile } from "./web3bio.js"

const ethereumClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ETHEREUM_RPC_URL ?? "https://ethereum-rpc.publicnode.com"),
})

const matchesService = (identity: string, suffixes: string[]) =>
  suffixes.some(suffix => identity.toLowerCase().endsWith(suffix.toLowerCase()))

const buildResolvedDomain = (
  serviceName: string,
  identity: string,
  type: "official" | "community",
  status: "official" | "established" | "emerging",
  explorerBaseUrl?: string,
): ResolvedDomain => ({
  service: serviceName,
  domain: identity,
  type,
  status,
  explorerUrl: explorerBaseUrl ? `${explorerBaseUrl}/${identity}` : undefined,
})

const uniqueDomains = (domains: ResolvedDomain[]) => {
  const seen = new Set<string>()
  return domains.filter(domain => {
    const key = `${domain.service}:${domain.domain.toLowerCase()}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

async function getProfiles(address: Address, profiles?: Web3BioProfile[]) {
  return profiles ?? resolveWeb3BioProfile(address)
}

async function resolveEthereum(address: Address, profiles?: Web3BioProfile[]) {
  const config = getChainByName("ethereum")
  if (!config) {
    throw new Error("Ethereum chain config missing")
  }

  const domains: ResolvedDomain[] = []
  const ens = await ethereumClient.getEnsName({ address }).catch(() => null)
  if (ens) {
    const service = config.domainServices[0]
    domains.push(
      buildResolvedDomain(
        service.name,
        ens,
        service.type,
        service.status,
        service.explorerBaseUrl,
      ),
    )
  }

  for (const profile of await getProfiles(address, profiles)) {
    for (const service of config.domainServices) {
      if (matchesService(profile.identity, service.tlds)) {
        domains.push(
          buildResolvedDomain(
            service.name,
            profile.identity,
            service.type,
            service.status,
            service.explorerBaseUrl,
          ),
        )
      }
    }
  }

  const deduped = uniqueDomains(domains)
  return {
    chain: config.name,
    domains: deduped,
    primaryDomain: deduped[0]?.domain ?? null,
    services: config.domainServices,
    explorerUrls: deduped
      .map(domain => domain.explorerUrl)
      .filter((url): url is string => Boolean(url)),
  } satisfies DomainResolution
}

async function resolveFromServices(
  address: Address,
  chainName: Exclude<ChainName, "ethereum">,
  profiles?: Web3BioProfile[],
) {
  const config = getChainByName(chainName)
  if (!config) {
    throw new Error(`Chain config missing for ${chainName}`)
  }

  const domains = uniqueDomains(
    (await getProfiles(address, profiles)).flatMap(profile =>
      config.domainServices
        .filter(service => matchesService(profile.identity, service.tlds))
        .map(service =>
          buildResolvedDomain(
            service.name,
            profile.identity,
            service.type,
            service.status,
            service.explorerBaseUrl,
          ),
        ),
    ),
  )

  return {
    chain: config.name,
    domains,
    primaryDomain: domains[0]?.domain ?? null,
    services: config.domainServices,
    explorerUrls: domains
      .map(domain => domain.explorerUrl)
      .filter((url): url is string => Boolean(url)),
  } satisfies DomainResolution
}

export async function resolveDomain(
  address: Address,
  chainName: ChainName,
  profiles?: Web3BioProfile[],
): Promise<DomainResolution> {
  switch (chainName) {
    case "ethereum":
      return resolveEthereum(address, profiles)
    case "base":
      return resolveFromServices(address, "base", profiles)
    case "robinhood":
      return resolveFromServices(address, "robinhood", profiles)
    case "arbitrum":
      return resolveFromServices(address, "arbitrum", profiles)
    case "optimism":
      return resolveFromServices(address, "optimism", profiles)
    case "arc":
      return resolveFromServices(address, "arc", profiles)
    case "hyperliquid":
      return resolveFromServices(address, "hyperliquid", profiles)
  }
}

export async function resolveDomainsForAllChains(
  address: Address,
  profiles?: Web3BioProfile[],
) {
  return Promise.all(chainConfig.map(chain => resolveDomain(address, chain.name, profiles)))
}
