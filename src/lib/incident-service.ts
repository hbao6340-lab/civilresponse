import { createHash, randomBytes } from "node:crypto";
import { generateReference } from "@/lib/utils";

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Create a public reference and a secret tracking token (store only the hash). */
export function createIncidentSecrets() {
  const publicReference = generateReference();
  const trackingToken = randomBytes(24).toString("base64url");
  return {
    publicReference,
    trackingToken,
    trackingTokenHash: sha256(trackingToken),
  };
}
