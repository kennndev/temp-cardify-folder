/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ethers, Log } from "ethers";
import { GelatoRelay, type SponsoredCallRequest } from "@gelatonetwork/relay-sdk";
import { PACK_FACTORY_ABI } from "@/app/abis/PackFactory";

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SVC = process.env.SUPABASE_SERVICE_KEY!;
const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_PACK_FACTORY_ADDRESS!;
const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || ethers.ZeroAddress;
const GELATO_API_KEY = process.env.GELATO_API_KEY!;
const GELATO_RELAY_URL = process.env.GELATO_RELAY_URL || "https://api.gelato.digital";
const RPC_URL = process.env.RPC_URL || 'https://sepolia.base.org';

const gelatoRelay = new GelatoRelay({ url: GELATO_RELAY_URL });

const safeParse = (iface: ethers.Interface, log: Log): ethers.LogDescription | undefined => {
  try { return iface.parseLog(log) || undefined; } catch { return undefined; }
};

async function sponsoredCall(target: string, data: string): Promise<string> {
  try {
    const request: SponsoredCallRequest = {
      chainId: BigInt(84532), // Base Sepolia
      target,
      data,
    };
    const { taskId } = await gelatoRelay.sponsoredCall(request, GELATO_API_KEY);
    return taskId;
  } catch (err: any) {
    if (err?.message?.includes("Unauthorized sponsored targ")) {
      throw new Error(`Contract not whitelisted for sponsorship. Whitelist ${target} in Gelato.`);
    }
    throw err;
  }
}

async function waitForTask(taskId: string, timeoutMs = 300000): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const status = await gelatoRelay.getTaskStatus(taskId);
      if (status?.taskState === 'ExecSuccess') return status.transactionHash!;
      if (status?.taskState === 'ExecReverted') throw new Error(status.lastCheckMessage || 'Execution reverted');
      if (status?.taskState === 'Cancelled') throw new Error('Task cancelled');
      await new Promise(r => setTimeout(r, 2000));
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error(`Gelato task polling timed out after ${timeoutMs}ms`);
}

export async function POST(req: NextRequest) {
  try {
    const missing = [
      ['SUPABASE_URL', SUPABASE_URL],
      ['SUPABASE_SERVICE_KEY', SUPABASE_SVC],
      ['NEXT_PUBLIC_PACK_FACTORY_ADDRESS', FACTORY_ADDRESS],
      ['GELATO_API_KEY', GELATO_API_KEY],
    ].filter(([_, v]) => !v).map(([k]) => k);
    if (missing.length) {
      return NextResponse.json({ success: false, error: `Missing env: ${missing.join(', ')}` }, { status: 500 });
    }

    const body = await req.json();
    const {
      name, symbol, description,
      tokenUris, // string[] (we will coerce to exactly 6)
      packPriceEth, maxPacks, royaltyBps,
      ownerAddress,
    } = body || {};

    if (!name || !symbol || !ownerAddress) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Auth: get user from Supabase JWT for credits
    const supabase = createClient(SUPABASE_URL, SUPABASE_SVC, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { data: profile, error: profErr } = await supabase
      .from('profiles').select('credits').eq('id', user.id).single();
    if (profErr || !profile) return NextResponse.json({ success: false, error: 'Profile not found' }, { status: 400 });
    const CREDITS_REQUIRED = 100;
    if ((profile.credits ?? 0) < CREDITS_REQUIRED) return NextResponse.json({ success: false, error: 'Insufficient credits' }, { status: 402 });

    // Normalize token URIs to length 6
    const first = Array.isArray(tokenUris) && tokenUris.length ? String(tokenUris[0]) : '';
    if (!first) return NextResponse.json({ success: false, error: 'No token image provided' }, { status: 400 });
    const uris: string[] = new Array(6).fill(first);
    for (let i = 0; i < Math.min(6, (tokenUris?.length || 0)); i++) uris[i] = String(tokenUris[i]);

    const mintWei = ethers.parseEther(String(packPriceEth || 0));
    const maxPacksBn = BigInt(maxPacks || 0);
    const royalty = BigInt(royaltyBps || 0) as unknown as number; // ABI type is uint96, Viem/ethers accept bigint; ethers v6 casts automatically

    // Encode call
    const iface = new ethers.Interface(PACK_FACTORY_ABI as any);
    const data = iface.encodeFunctionData('createCollection', [{
      name,
      symbol,
      owner: ownerAddress,
      tokenURIs: uris,
      packPrice: mintWei,
      maxPacks: maxPacksBn,
      royaltyBps: Number(royaltyBps || 0),
      royaltyReceiver: ownerAddress,
      marketplace: MARKETPLACE_ADDRESS,
    }]);

    const taskId = await sponsoredCall(FACTORY_ADDRESS, data);
    const txHash = await waitForTask(taskId);

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const receipt = await provider.waitForTransaction(txHash);
    if (!receipt) return NextResponse.json({ success: false, error: 'Transaction receipt not found' }, { status: 502 });

    const factory = new ethers.Contract(FACTORY_ADDRESS, PACK_FACTORY_ABI as any, provider);
    const parsed = receipt.logs.map(l => safeParse(factory.interface, l)).find(l => l?.name === 'CollectionCreated');
    if (!parsed) return NextResponse.json({ success: false, error: 'CollectionCreated event not found' }, { status: 502 });

    const args: any = parsed.args;
    const collectionAddress: string = args.collection;
    const eventOwner: string = args.owner;

    if (eventOwner?.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json({ success: false, error: `Collection ownership mismatch. Expected ${ownerAddress}, got ${eventOwner}` }, { status: 502 });
    }

    // Persist basic metadata (best-effort, keep columns minimal)
    try {
      // Prefer dedicated pack_collections table if available
      const packRow = {
        collection_address: collectionAddress.toLowerCase(),
        owner_address: ownerAddress.toLowerCase(),
        user_id: user.id,
        name,
        symbol,
        description,
        pack_image_uri: uris[5] || uris[0],
        nft_image_uris: uris.slice(0,5),
        all_token_uris: uris,
        // Convention: token IDs 0-4 -> NFT images, ID 5 -> pack cover
        token_id_map: { "0": 0, "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 },
        pack_price_wei: mintWei.toString(),
        max_packs: maxPacksBn.toString(),
        royalty_bps: Number(royaltyBps || 0),
        royalty_recipient: ownerAddress.toLowerCase(),
        active: true,
      } as any;

      const ins = await supabase.from('pack_collections').insert(packRow);
      if (ins.error) {
        // Fallback to nft_collections with minimal fields if pack_collections does not exist
        await supabase.from('nft_collections').insert({
          collection_address: packRow.collection_address,
          owner_address: packRow.owner_address,
          user_id: packRow.user_id,
          name: packRow.name,
          symbol: packRow.symbol,
          description: packRow.description,
          image_uri: packRow.pack_image_uri,
          max_supply: packRow.max_packs,
          mint_price: packRow.pack_price_wei,
          royalty_bps: packRow.royalty_bps,
          royalty_recipient: packRow.royalty_recipient,
          active: true,
        });
      }
    } catch {}

    // Deduct credits
    await supabase.from('profiles').update({ credits: (profile.credits ?? 0) - CREDITS_REQUIRED }).eq('id', user.id);

    return NextResponse.json({ success: true, collectionAddress, transactionHash: txHash, creditsDeducted: CREDITS_REQUIRED });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
