import bcrypt from 'bcryptjs'

/** 恢复码：5 个大写字母/数字，去掉 0/O/1/I 等易混字符 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const generateRecoverCode = (): string => {
  const bytes = new Uint8Array(5)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** 恢复码统一格式：去空格转大写 */
export const normalizeCode = (input: string): string =>
  (input || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export const hashPassword = (p: string) => bcrypt.hash(p, 10)
