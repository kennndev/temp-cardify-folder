"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { UploadArea } from "@/components/upload-area"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Loader2, Image as ImageIcon, Crown } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getSupabaseBrowserClient } from "@/lib/supabase-browser"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { usePrivy, useWallets, useCreateWallet } from "@privy-io/react-auth"

type Step = "wallet" | "images" | "form" | "review" | "deploying" | "complete"

export default function PackCollectionPage() {
  const [step, setStep] = useState<Step>("wallet")
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)

  const [useSameImage, setUseSameImage] = useState(true)
  const [uploadedImages, setUploadedImages] = useState<(string | null)[]>([null, null, null, null, null, null])
  const [pinataUrls, setPinataUrls] = useState<(string | null)[]>([null, null, null, null, null, null])
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    packPriceEth: 0,
    maxPacks: 100,
    royaltyBps: 500,
  })

  const [collectionAddress, setCollectionAddress] = useState<string | null>(null)
  const [deploymentTxHash, setDeploymentTxHash] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Wallet
  const { address: walletAddress, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const { ready, login, authenticated } = usePrivy()
  const { wallets } = useWallets()
  const createWalletHook = useCreateWallet({
    onSuccess: (wallet) => {
      console.log('✅ [Wallet Creation] Embedded wallet created successfully:', wallet)
      toast({
        title: "Wallet Created! 🎉",
        description: "Your embedded wallet is ready for pack collections",
        variant: "default"
      })
    },
    onError: (error) => {
      console.error('❌ [Wallet Creation] Failed to create wallet:', error)
      toast({
        title: "Wallet Creation Failed",
        description: "Failed to create embedded wallet. Please try again.",
        variant: "destructive"
      })
    }
  })
  const createWallet = createWalletHook?.createWallet || (() => {
    console.warn('createWallet not available')
  })

  const embeddedWalletAddress = wallets?.find((w) => w.walletClientType === "privy" || w.walletClientType === "privy-v2")?.address
  const finalWalletAddress = embeddedWalletAddress || walletAddress || wallets?.[0]?.address || null

  // Auth + credits
  useEffect(() => {
    const run = async () => {
      const supabase = getSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUser(user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single()
      if (profile && typeof profile.credits === 'number') setCredits(profile.credits)
    }
    run()
  }, [])

  useEffect(() => {
    if ((isConnected && walletAddress) || (authenticated && embeddedWalletAddress)) {
      setStep('images')
    }
  }, [isConnected, walletAddress, authenticated, embeddedWalletAddress])

  const hasEnoughCredits = credits >= 100

  // Upload one image (index 0..5). If useSameImage, index is 0 and replicated; index 5 is pack cover
  const handleImageUpload = async (file: File, index: number = 0) => {
    setUploadingIndex(index)
    try {
      const fileId = Math.random().toString(36).substring(2) + Date.now().toString(36)
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1]
          const chunkSize = 2 * 1024 * 1024
          const chunks: string[] = []
          for (let i = 0; i < base64Data.length; i += chunkSize) chunks.push(base64Data.slice(i, i + chunkSize))

          let finalPinataUrl: string | null = null
          for (let i = 0; i < chunks.length; i++) {
            const res = await fetch('/api/upload-chunk', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chunk: chunks[i], chunkIndex: i, totalChunks: chunks.length, fileId })
            })
            if (!res.ok) throw new Error('Chunk upload failed')
            const result = await res.json()
            if (result.pinataUrl) finalPinataUrl = result.pinataUrl
          }

          if (!finalPinataUrl) throw new Error('Upload incomplete')

          // Update local state
          const url = URL.createObjectURL(file)
          if (useSameImage && index !== 5) {
            setUploadedImages([url, url, url, url, url, url])
            setPinataUrls([finalPinataUrl, finalPinataUrl, finalPinataUrl, finalPinataUrl, finalPinataUrl, finalPinataUrl])
          } else {
            setUploadedImages(prev => prev.map((v, idx) => idx === index ? url : v))
            setPinataUrls(prev => prev.map((v, idx) => idx === index ? finalPinataUrl! : v))
          }

          setStep('form')
        } catch (e) {
          toast({ title: 'Upload Failed', description: 'Failed to upload image to IPFS', variant: 'destructive' })
        } finally {
          setUploadingIndex(null)
        }
      }
      reader.onerror = () => {
        toast({ title: 'Upload Failed', description: 'Failed to read file', variant: 'destructive' })
        setUploadingIndex(null)
      }
      reader.readAsDataURL(file)
    } catch {
      toast({ title: 'Upload Failed', description: 'Failed to upload image to IPFS', variant: 'destructive' })
      setUploadingIndex(null)
    }
  }

  const readyToDeploy = useMemo(() => {
    const baseOk = pinataUrls.filter(Boolean).length > 0
    // Require 5 NFT images if not using same image; pack cover (index 5) is optional and falls back to first
    const imagesOk = baseOk && (useSameImage || pinataUrls.slice(0,5).every(Boolean))
    return !!finalWalletAddress && !!user && imagesOk && formData.name && formData.symbol
  }, [finalWalletAddress, user, pinataUrls, useSameImage, formData])

  const handleDeploy = async () => {
    if (!readyToDeploy) return
    setLoading(true)
    setStep('deploying')
    try {
      const supabase = getSupabaseBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Auth required')

      // Ensure exactly 6 URIs as required by ABI
      const first = pinataUrls.find(Boolean)!
      // If useSameImage=true, replicate index 0 for NFTs and optionally allow a separate pack cover at index 5
      let tokenUris: string[]
      if (useSameImage) {
        const packCover = pinataUrls[5] || first
        tokenUris = [first, first, first, first, first, packCover]
      } else {
        tokenUris = [0,1,2,3,4,5].map(i => pinataUrls[i] || first)
      }

      const res = await fetch('/api/deploy-pack-collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          tokenUris,
          packPriceEth: Number(formData.packPriceEth) || 0,
          maxPacks: Number(formData.maxPacks) || 0,
          royaltyBps: Number(formData.royaltyBps) || 0,
          ownerAddress: finalWalletAddress,
        })
      })

      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Failed to deploy pack collection')

      setCollectionAddress(result.collectionAddress)
      setDeploymentTxHash(result.transactionHash)
      setStep('complete')
      toast({ title: 'Pack Collection Deployed', description: 'Your pack collection is live!', variant: 'default' })
    } catch (e: any) {
      setStep('form')
      toast({ title: 'Deployment Failed', description: e?.message || 'Unknown error', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden font-mono">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 scanlines opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-cyber-black pointer-events-none" />

      {/* Navigation rendered by layout */}

      <div className="px-6 py-8 pt-24 pb-20">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="bg-slate-900/95 border-cyan-500/50">
            <CardHeader>
              <CardTitle className="text-white">Create Pack NFT Series</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step: Wallet */}
              {step === 'wallet' && (
                <div className="space-y-4">
                  <p className="text-gray-200">Connect or create a wallet to continue.</p>
                  <div className="flex gap-3 flex-wrap">
                    {connectors.map((c) => (
                      <Button key={c.id} onClick={() => connect({ connector: c })}>
                        Connect {c.name}
                      </Button>
                    ))}
                    <Button onClick={() => { if (createWallet) createWallet() }}>Create embedded wallet</Button>
                  </div>
                </div>
              )}

              {/* Step: Images */}
              {step === 'images' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-white">Artwork</Label>
                    <label className="text-sm text-gray-200 flex items-center gap-2">
                      <input type="checkbox" checked={useSameImage} onChange={(e) => setUseSameImage(e.target.checked)} />
                      Use same image for all NFTs
                    </label>
                  </div>

                  {useSameImage ? (
                    <div className="space-y-6">
                      <div>
                        <Label className="text-gray-200">Artwork for NFTs (will be reused)</Label>
                        <UploadArea onFileUpload={(f) => handleImageUpload(f, 0)} isUploading={uploadingIndex === 0} uploadedImage={uploadedImages[0]} />
                      </div>
                      <div>
                        <Label className="text-gray-200">Optional: Pack Cover Image</Label>
                        <UploadArea onFileUpload={(f) => handleImageUpload(f, 5)} isUploading={uploadingIndex === 5} uploadedImage={uploadedImages[5]} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[0,1,2,3,4,5].map((i) => (
                        <div key={i} className="space-y-2">
                          <Label className="text-gray-200">{i === 5 ? 'Pack Cover' : `NFT #${i+1}`}</Label>
                          <UploadArea onFileUpload={(f) => handleImageUpload(f, i)} isUploading={uploadingIndex === i} uploadedImage={uploadedImages[i]} />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button onClick={() => setStep('form')} disabled={(useSameImage && !pinataUrls[0]) || (!useSameImage && !pinataUrls.slice(0,5).every(Boolean))}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Form */}
              {step === 'form' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-200">Name</Label>
                      <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-gray-200">Symbol</Label>
                      <Input value={formData.symbol} onChange={(e) => setFormData({ ...formData, symbol: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-200">Description</Label>
                    <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-200">Pack Price (ETH)</Label>
                      <Input type="number" min={0} step="0.0001" value={formData.packPriceEth}
                        onChange={(e) => setFormData({ ...formData, packPriceEth: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-gray-200">Max Packs</Label>
                      <Input type="number" min={1} value={formData.maxPacks}
                        onChange={(e) => setFormData({ ...formData, maxPacks: Number(e.target.value) })} />
                    </div>
                    <div>
                      <Label className="text-gray-200">Royalty (bps)</Label>
                      <Input type="number" min={0} max={10000} value={formData.royaltyBps}
                        onChange={(e) => setFormData({ ...formData, royaltyBps: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-gray-200 text-sm">
                      Credits required: <Badge variant="outline">100</Badge> {hasEnoughCredits ? '(available)' : '(insufficient)'}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setStep('images')}>Back</Button>
                      <Button onClick={() => setStep('review')} disabled={!readyToDeploy || !hasEnoughCredits}>Review</Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Step: Review */}
              {step === 'review' && (
                <div className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-3 text-gray-200 text-sm">
                    <div><span className="text-gray-400">Name:</span> {formData.name}</div>
                    <div><span className="text-gray-400">Symbol:</span> {formData.symbol}</div>
                    <div><span className="text-gray-400">Owner:</span> {finalWalletAddress}</div>
                    <div><span className="text-gray-400">Pack Price:</span> {formData.packPriceEth} ETH</div>
                    <div><span className="text-gray-400">Max Packs:</span> {formData.maxPacks}</div>
                    <div><span className="text-gray-400">Royalty:</span> {formData.royaltyBps} bps</div>
                  </div>
                  <div className="grid sm:grid-cols-3 gap-4">
                    {(useSameImage ? [uploadedImages[0], uploadedImages[5]] : uploadedImages.slice(0,6))
                      .filter(Boolean)
                      .map((src, i) => (
                        <div key={i} className="border border-slate-600 rounded-lg p-2 bg-slate-800">
                          {src ? <img src={src} alt={`Preview ${i+1}`} className="w-full rounded" /> : (
                            <div className="h-24 flex items-center justify-center text-gray-400"><ImageIcon className="w-6 h-6" /></div>
                          )}
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setStep('form')}>Back</Button>
                    <Button onClick={handleDeploy} disabled={!readyToDeploy || loading}>
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Deploy
                    </Button>
                  </div>
                </div>
              )}

              {/* Step: Deploying */}
              {step === 'deploying' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                    <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span className="text-gray-100">Deploying via Gelato sponsorship...</span>
                  </div>
                </div>
              )}

              {/* Step: Complete */}
              {step === 'complete' && collectionAddress && (
                <div className="space-y-6">
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/50 rounded-xl">
                    <h4 className="text-emerald-400 font-bold text-lg mb-4 flex items-center gap-2">
                      <Crown className="w-5 h-5" />
                      Pack Collection Deployed
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-800 rounded-lg border border-emerald-500/30">
                        <span className="text-gray-100 font-medium block mb-2">Address:</span>
                        <span className="text-white font-mono text-xs sm:text-sm break-all block bg-slate-900 p-2 rounded border border-slate-700">{collectionAddress}</span>
                      </div>
                      {deploymentTxHash && (
                        <div className="p-3 bg-slate-800 rounded-lg border border-emerald-500/30">
                          <span className="text-gray-100 font-medium block mb-2">Transaction:</span>
                          <span className="text-white font-mono text-xs break-all block bg-slate-900 p-2 rounded border border-slate-700">{deploymentTxHash}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => window.open(`https://sepolia.basescan.org/address/${collectionAddress}`, '_blank')} variant="outline" className="w-full sm:flex-1">
                      View on Basescan
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
