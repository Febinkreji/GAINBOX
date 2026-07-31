import { randomBytes, createHash } from 'node:crypto'

// 256 bits of entropy. Unlike a password, this is never chosen by a human
// and never reused — brute-forcing it is infeasible regardless of hash
// speed, so a fast, unsalted cryptographic hash (not bcrypt/argon2, which
// exist to slow down guessing a *low*-entropy secret) is the correct,
// standard choice for high-entropy tokens like this one.
const TOKEN_BYTES = 32

/** Generates a fresh invitation token — returns both the plaintext (returned to the caller exactly once) and its hash (the only thing ever persisted). */
export function generateInvitationToken() {
  const token = randomBytes(TOKEN_BYTES).toString('hex')
  return { token, tokenHash: hashInvitationToken(token) }
}

export function hashInvitationToken(token) {
  return createHash('sha256').update(token).digest('hex')
}
