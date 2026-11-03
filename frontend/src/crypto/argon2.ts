import { argon2id } from 'hash-wasm';
import { KdfParameters } from '@zerolock/shared';

// Default secure Argon2id parameters
export const DEFAULT_ARGON2_PARAMS: KdfParameters = {
  memoryCost: 19456, // 19 MB (standard browser-safe memory limit)
  timeCost: 3,       // 3 iterations
  parallelism: 1,    // 1 lane
  hashLength: 32,    // 256-bit derived key length
};

export async function deriveArgon2idKey(
  password: string,
  salt: Uint8Array,
  params: KdfParameters = DEFAULT_ARGON2_PARAMS
): Promise<Uint8Array> {
  const binaryOutput = await argon2id({
    password,
    salt,
    parallelism: params.parallelism,
    iterations: params.timeCost,
    memorySize: params.memoryCost,
    hashLength: params.hashLength,
    outputType: 'binary',
  });

  return binaryOutput as Uint8Array;
}
