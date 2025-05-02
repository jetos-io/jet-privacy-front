import { getPublicKeyAsync, utils, type Hex } from '@noble/ed25519';
import { bytesToHex } from '@noble/hashes/utils';

export async function useKeypair(): Promise<{ skHex: Hex; pkHex: Hex }> {
  const sk = utils.randomPrivateKey();
  const pk = await getPublicKeyAsync(sk);
  return {
    skHex: bytesToHex(sk),
    pkHex: bytesToHex(pk)
  };
}
