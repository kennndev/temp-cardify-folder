"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/navigation";
import { CometCard } from "@/components/ui/comet-card";
import { CreditCard, ArrowRight, Zap, Package, Loader2, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

type PackCollection = {
  id: number;
  collection_address: string;
  name: string;
  symbol: string;
  description: string;
  pack_image_uri: string | null;
  pack_price_wei: string;
  max_packs: string;
  created_at: string;
};

export default function LaunchSeriesPage() {
  const [packCollections, setPackCollections] = useState<PackCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackCollections = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("pack_collections")
          .select("*")
          .eq("active", true)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) {
          console.error("Error fetching pack collections:", error);
        } else {
          setPackCollections((data as PackCollection[]) || []);
        }
      } catch (err) {
        console.error("Error fetching pack collections:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPackCollections();
  }, []);
  return (
    <div className="min-h-screen bg-cyber-black relative overflow-hidden font-mono">
      <div className="fixed inset-0 cyber-grid opacity-10 pointer-events-none" />
      <div className="fixed inset-0 scanlines opacity-20 pointer-events-none" />
      <div className="fixed inset-0 bg-cyber-black pointer-events-none" />

      <Navigation />

      <div className="px-6 py-8 pt-24 pb-20">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 text-center text-white relative z-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-wider mb-4 drop-shadow-lg">
              Launch Series
            </h1>
            <p className="text-white text-lg drop-shadow-lg">
              Create high-quality trading cards
            </p>
          </div>

          {/* Series Options */}
          {/* items-stretch ensures each grid item can stretch; CometCard is h-full so tracks equalize */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8 items-stretch">
            {/* Physical Cards Option */}
            <div className="h-full">
              <CometCard className="h-full">
              <Card className="bg-cyber-dark/60 border-cyber-green/30 hover:border-cyber-green/50 transition-all duration-300 cursor-pointer group h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <CreditCard className="w-6 h-6 text-cyber-green" />
                    Physical Cards Series
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Create high-quality physical trading cards
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col h-full justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-green rounded-full" />
                      <span>High-quality printed cards</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-green rounded-full" />
                      <span>Professional card design</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-green rounded-full" />
                      <span>Durable card stock</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-green rounded-full" />
                      <span>Custom artwork support</span>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full cyber-button h-11 sm:h-12 text-sm sm:text-base font-medium mt-6"
                  >
                    <Link href="/series/create" className="flex items-center justify-center">
                      CREATE SERIES
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              </CometCard>
            </div>
            

            {/* NFTs Only Option */}
            <div className="h-full">
              <CometCard className="h-full">
              <Card className="bg-cyber-dark/60 border-cyber-pink/30 hover:border-cyber-pink/50 transition-all duration-300 cursor-pointer group h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <Zap className="w-6 h-6 text-cyber-pink" />
                    NFTs
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Digital-only NFT series</p>
                </CardHeader>
                <CardContent className="flex flex-col h-full justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-pink rounded-full" />
                      <span>Digital NFT collection</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-pink rounded-full" />
                      <span>Smart contract deployment</span>
                    </div>
                                <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-pink rounded-full" />
                      <span>Automatic royalty setup</span>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full cyber-button h-11 sm:h-12 text-sm sm:text-base font-medium mt-6"
                  >
                    <Link href="/series/nfts-only" className="flex items-center justify-center">
                      CHOOSE METHOD
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              </CometCard>
            </div>

            {/* Pack NFT Series Option */}
            <div className="h-full">
              <CometCard className="h-full">
              <Card className="bg-cyber-dark/60 border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300 cursor-pointer group h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <Package className="w-6 h-6 text-cyan-300" />
                    Pack NFT Series
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Deploy a pack collection (5 NFTs per pack)
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col h-full justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyan-300 rounded-full" />
                      <span>Wallet + gasless deploy</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyan-300 rounded-full" />
                      <span>Upload one image or multiple images and reuse across NFTs</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyan-300 rounded-full" />
                      <span>Set pack price and max packs</span>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full cyber-button h-11 sm:h-12 text-sm sm:text-base font-medium mt-6"
                  >
                    <Link
                      href="/series/pack-collection"
                      className="flex items-center justify-center"
                    >
                      CREATE PACK SERIES
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              </CometCard>
            </div>

            {/* Cards + Redeemable NFTs Option */}
            <div className="h-full">
              <CometCard className="h-full">
              <Card className="bg-cyber-dark/60 border-cyber-yellow/30 hover:border-cyber-yellow/50 transition-all duration-300 cursor-pointer group h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-3">
                    <Package className="w-6 h-6 text-cyber-yellow" />
                    Cards + Redeemable NFTs
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Physical cards with digital NFT redemption
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col h-full justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-yellow rounded-full" />
                      <span>Physical + Digital</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-yellow rounded-full" />
                      <span>ERC1155 smart contract</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-yellow rounded-full" />
                      <span>Redemption codes</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <span className="w-2 h-2 bg-cyber-yellow rounded-full" />
                      <span>Blockchain integration</span>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="w-full cyber-button h-11 sm:h-12 text-sm sm:text-base font-medium mt-6"
                  >
                    <Link
                      href="/series/cards-with-nfts"
                      className="flex items-center justify-center"
                    >
                      CHOOSE METHOD
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
              </CometCard>
            </div>
          </div>

      

          {/* Info Section */}
       {/*   <Card className="mt-8 bg-white/10 backdrop-blur-sm border-2 border-cyan-400 shadow-2xl">
            <CardHeader className="bg-white/5 border-b-2 border-cyan-400">
              <CardTitle className="text-white flex items-center gap-2 text-2xl font-bold">
                <CreditCard className="w-7 h-7 text-cyan-300" />
                Physical Card Creation Process
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-white/5 p-8">
              <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-4 p-6 bg-white/10 rounded-xl border-2 border-emerald-400/50">
                  <h4 className="text-emerald-300 font-bold text-xl">1. Design Cards</h4>
                  <p className="text-base text-white font-medium">
                    Use AI generation or upload your own artwork for professional card designs
                  </p>
                </div>
                <div className="space-y-4 p-6 bg-white/10 rounded-xl border-2 border-cyan-400/50">
                  <h4 className="text-cyan-300 font-bold text-xl">2. Configure Series</h4>
                  <p className="text-base text-white font-medium">
                    Set up your series details, pricing, and card specifications
                  </p>
                </div>
                <div className="space-y-4 p-6 bg-white/10 rounded-xl border-2 border-purple-400/50">
                  <h4 className="text-purple-300 font-bold text-xl">3. Print & Launch</h4>
                  <p className="text-base text-white font-medium">
                    High-quality printing and launch your physical card series
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>*/}
        </div>
      </div>
    </div>
  );
}
