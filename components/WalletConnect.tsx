/* ───────────────── Wallet Button ───────────────── */
import { ConnectWallet } from '@coinbase/onchainkit/wallet'

export function WalletButton() {
  return (
    <ConnectWallet
      className="bg-cyber-dark border-2 border-cyber-green text-cyber-green hover:bg-cyber-green/10"
      disconnectedLabel="Connect Wallet"
    />
  )
}
