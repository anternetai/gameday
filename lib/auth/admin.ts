export const ADMIN_COOKIE_NAME = "gd_admin"

export const ADMIN_PASSPHRASE = process.env.ADMIN_PASSPHRASE ?? "88!"

export const ADMIN_COOKIE_TOKEN =
  process.env.ADMIN_COOKIE_TOKEN ??
  "v1.gd-admin-bypass-7f2a1b4c9d8e6f5a3b2c1d0e9f8a7b6c"

export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
