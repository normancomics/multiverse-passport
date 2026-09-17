# Multiverse Passport

Multiverse Passport is an ERC-8257 tool for OpenSea's agent tool bazaar that checks uNRMN/uNORMANCOMICS and thegoodlums membership overlap, exposes a free public overlap check, and returns a gated full passport card with multichain identity enrichment for the verified caller.

## What it does

- Public path: any caller can submit an `address` and receive membership status only.
- Gated path: an authenticated caller uses `mode: "gated"` without `address` and receives a full Multiverse Passport for their own wallet.
- Membership logic: checks whether a wallet holds both a uNRMN/uNORMANCOMICS NFT or token and a thegoodlums NFT.
- Custom passport builder: optionally accepts your own contract addresses, asset types, chain selections, unlock descriptions, and fee metadata per request.
- Social resolution: enriches the gated passport with X, Farcaster, ENS, avatar, and display name data via web3.bio.
- Multichain identity: ranks ENS, Basenames, Robinhood, Arbitrum, Optimism, Arc, and Hyperliquid naming data.
- Monetization hooks: records usage and USDC recipient metadata for each lookup.

## Repository structure

- `/src/handler.ts` - public/gated tool logic
- `/src/manifest.ts` - ERC-8257 manifest definition
- `/src/onchain.ts` - balance checks for uNRMN and thegoodlums
- `/src/web3bio.ts` - social identity resolution helpers
- `/src/chains.ts` - 7-chain metadata and service mapping
- `/src/domains.ts` - chain-aware domain discovery
- `/src/explorers.ts` - explorer link and balance enrichment
- `/src/multichain.ts` - multichain passport assembly
- `/src/monetization.ts` - usage and USDC revenue logging hooks
- `/api/well-known.ts` - Vercel route for `/.well-known/ai-tool/multiverse-passport.json`
- `/api/tool.ts` - Vercel route for the live tool endpoint

## Multi-chain support

| Chain | Primary naming service | Status | Notes |
| --- | --- | --- | --- |
| Ethereum | ENS | Official | Canonical `.eth` naming layer |
| Base | Basenames | Official | Coinbase/Base naming built on ENS conventions |
| Robinhood Chain | HoodDomains, rns.gg, robinhoodns.xyz | Community | Fragmented early ecosystem |
| Arbitrum | SPACE ID `.arb` | Community | Most established `.arb` path today |
| Optimism | OPNS, ONS, Optimistic Domains | Community | Competing projects, no single canonical winner |
| Arc | ArcNS, Orixa, ArcName | Community | Early-stage landscape |
| Hyperliquid | Hyperliquid Names | Community | De facto standard within ecosystem |

The passport returns all discovered domains, service attribution, and explorer links, while ordering results around a caller-selected preferred chain.

## Environment variables

Copy `.env.example` to `.env.local` or `.env` and fill in the real values.

Required for a production deployment:

- `TOOL_ENDPOINT` - deployed `https://.../api/tool` URL
- `TOOL_ID` - onchain tool ID returned by OpenSea registration
- `OPERATOR_ADDRESS` - address used by `predicateGate` for zero-value EIP-3009 challenges
- `RPC_URL` or `BASE_RPC_URL` - Base RPC for core asset checks
- `WEB3BIO_API_KEY` - API key from web3.bio
- `UNRMN_NFT_ADDRESS` - uNRMN/uNORMANCOMICS ERC-721 collection
- `GOODLUMS_NFT_ADDRESS` - thegoodlums ERC-721 collection
- `USDC_RECIPIENT_ADDRESS` - defaults to `0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7`

Optional values:

- `UNRMN_TOKEN_ADDRESS` - add this if uNRMN access should also recognize an ERC-20 balance
- RPC overrides for Ethereum, Arbitrum, Optimism, Robinhood, Arc, and Hyperliquid

## Local development

```bash
npm install
npm run build
npm run dev
```

Endpoints:

- `http://localhost:3000/.well-known/ai-tool/multiverse-passport.json`
- `http://localhost:3000/api/tool`

### Testing the tool locally

Public lookup example:

```bash
curl -X POST http://localhost:3000/api/tool \
  -H 'content-type: application/json' \
  -d '{"address":"0x0000000000000000000000000000000000000000","chain":"base"}'
```

Custom passport example:

```bash
curl -X POST http://localhost:3000/api/tool \
  -H 'content-type: application/json' \
  -d '{
    "mode":"public",
    "address":"0x0000000000000000000000000000000000000000",
    "customPassport":{
      "name":"Creator Passport",
      "match":"all",
      "gates":[
        {
          "chain":"base",
          "contractAddress":"0x0000000000000000000000000000000000000000",
          "type":"erc721"
        },
        {
          "chain":"arbitrum",
          "contractAddress":"0x0000000000000000000000000000000000000000",
          "type":"erc20",
          "minBalance":"1000000000000000000"
        }
      ],
      "unlocks":[
        "Specialized chat access",
        "Bonus NFT allowlist",
        "Tiered community perks"
      ],
      "feeUsdc":"0.25"
    }
  }'
```

Gated lookup example after registration:

```bash
PRIVATE_KEY=0x... RPC_URL=https://mainnet.base.org \
  npx @opensea/tool-sdk auth http://localhost:3000/api/tool \
  --body '{"mode":"gated"}'
```

Manifest validation:

```bash
npm run validate
```

## Deploy to Vercel

```bash
npm install
npm run build
npx vercel
```

After the first deploy, set `TOOL_ENDPOINT` to your deployed `/api/tool` URL and redeploy.

## Register on OpenSea

```bash
PRIVATE_KEY=0x... RPC_URL=https://mainnet.base.org \
  npx @opensea/tool-sdk register \
  --metadata https://your-domain.vercel.app/.well-known/ai-tool/multiverse-passport.json \
  --network base \
  --nft-gate 0xYOUR_UNRMN_COLLECTION
```

Then:

1. Copy the returned `TOOL_ID` into your environment.
2. Redeploy Vercel so `predicateGate` can use the live ID.
3. Verify the deployed metadata:

```bash
npx @opensea/tool-sdk verify https://your-domain.vercel.app/.well-known/ai-tool/multiverse-passport.json
```

4. Smoke test the live endpoint:

```bash
PRIVATE_KEY=0x... RPC_URL=https://mainnet.base.org \
  npx @opensea/tool-sdk smoke \
  --endpoint https://your-domain.vercel.app/api/tool \
  --tool-id YOUR_TOOL_ID \
  --expect 200
```

## Add it to OpenSea's agent list

1. Deploy the Vercel app.
2. Register the tool onchain with `@opensea/tool-sdk register`.
3. Set `TOOL_ID` and redeploy.
4. Submit the metadata URL to OpenSea's agent tool flow if additional listing review is requested.
5. Keep the well-known manifest URL stable.

## How the public and gated flows work

### Public overlap check

- Send a POST body with `mode: "public"` and `address`.
- The tool returns only membership status.
- No caller signature is required.
- No social handles are resolved.

### Gated full passport

- Send a POST body with `mode: "gated"` and without `address`.
- The first request receives a zero-value EIP-3009 challenge from `predicateGate`.
- Retry with `npx @opensea/tool-sdk auth` or an ERC-8257-compatible client.
- The tool resolves the verified caller's own multichain passport.
- If you include `customPassport`, the tool also evaluates your manually supplied contracts and returns the unlocks that wallet qualifies for.

## Monetization and revenue tracking

`src/monetization.ts` logs each lookup with caller, timestamp, endpoint, response type, amount, and recipient wallet metadata. The default recipient is:

- `normancomics.eth`
- `0x3d95d4a6dbae0cd0643a82b13a13b08921d6adf7`

The module also exposes per-chain USDC address helpers for Ethereum, Base, Arbitrum, Optimism, Robinhood, Arc, and Hyperliquid.

## OpenSea SDK documentation

- SDK mirror: https://github.com/ProjectOpenSea/tool-sdk
- ERC-8257 registry docs: https://docs.opensea.io/docs/agent-tool-registry

## Notes for the broader passport-builder vision

This scaffold now supports ad hoc creator-defined passport checks in a single request. For a fuller creator platform later, add persistent template storage, reusable creator dashboards, automated reward delivery, and onchain fee settlement.
