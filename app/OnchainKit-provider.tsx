'use client'

import { OnchainKitProvider } from '@coinbase/onchainkit'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ReactNode } from 'react'

type ProvidersProps = {
  children: ReactNode
}

export const wagmi = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
})

const query = new QueryClient()

export function OnchainKitProviders({ children }: ProvidersProps) {
  const apiKey = process.env.NEXT_PUBLIC_ONCHAIN_KIT_API_KEY
  
  return (
    <WagmiProvider config={wagmi}>
      <QueryClientProvider client={query}>
        <OnchainKitProvider
          {...(apiKey && { apiKey })}
          chain={base}
          config={{
            appearance: {
              mode: 'dark',
            },
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

