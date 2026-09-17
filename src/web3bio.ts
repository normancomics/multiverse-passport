import type { Address } from "viem"
import type { SocialIdentitySummary, Web3BioProfile } from "./types.js"

const WEB3BIO_API_URL = "https://api.web3.bio/profile"

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])

const toProfile = (value: unknown): Web3BioProfile | null => {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const platform =
    typeof record.platform === "string"
      ? record.platform
      : typeof record.network === "string"
        ? record.network
        : typeof record.provider === "string"
          ? record.provider
          : "unknown"
  const identity =
    typeof record.identity === "string"
      ? record.identity
      : typeof record.handle === "string"
        ? record.handle
        : typeof record.name === "string"
          ? record.name
          : ""

  if (!identity) {
    return null
  }

  return {
    platform,
    identity,
    address: typeof record.address === "string" ? record.address : undefined,
    displayName:
      typeof record.displayName === "string"
        ? record.displayName
        : typeof record.display_name === "string"
          ? record.display_name
          : typeof record.name === "string"
            ? record.name
            : null,
    avatar:
      typeof record.avatar === "string"
        ? record.avatar
        : typeof record.avatar_url === "string"
          ? record.avatar_url
          : null,
    links: asArray(record.links)
      .map(link => (typeof link === "string" ? link : null))
      .filter((link): link is string => Boolean(link)),
  }
}

export async function resolveWeb3BioProfile(
  address: Address,
): Promise<Web3BioProfile[]> {
  const apiKey = process.env.WEB3BIO_API_KEY
  if (!apiKey) {
    return []
  }

  const response = await fetch(`${WEB3BIO_API_URL}/${address}`, {
    headers: { "x-api-key": apiKey },
  })

  if (!response.ok) {
    throw new Error(`web3.bio lookup failed with ${response.status}`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  const candidates = [
    ...asArray(payload.identities),
    ...asArray(payload.links),
    ...asArray(payload.profiles),
    ...asArray(payload.accounts),
  ]

  const profiles = candidates
    .map(toProfile)
    .filter((profile): profile is Web3BioProfile => Boolean(profile))

  if (profiles.length > 0) {
    return profiles
  }

  const fallback = toProfile(payload)
  return fallback ? [fallback] : []
}

export function summarizeIdentity(
  profiles: Web3BioProfile[],
): SocialIdentitySummary {
  const findByPlatform = (platforms: string[], suffixes: string[] = []) =>
    profiles.find(profile => {
      const normalized = profile.platform.toLowerCase()
      return (
        platforms.includes(normalized) ||
        suffixes.some(suffix => profile.identity.toLowerCase().endsWith(suffix))
      )
    })

  const twitter = findByPlatform(["x", "twitter"])
  const farcaster = findByPlatform(["farcaster"])
  const ens = findByPlatform(["ens"], [".eth", ".base.eth"])
  const displayProfile = profiles.find(
    profile => profile.displayName || profile.avatar,
  )

  return {
    twitter: twitter?.identity ?? null,
    farcaster: farcaster?.identity ?? null,
    ens: ens?.identity ?? null,
    displayName: displayProfile?.displayName ?? ens?.identity ?? null,
    avatar: displayProfile?.avatar ?? null,
    links: profiles.flatMap(profile => profile.links ?? []),
  }
}
