import 'server-only'
import { getRedisClient } from './redis'
import logger from './logger'
import defaultConfig from './defaults.json'

/**
 * Configuration Loader
 * 
 * Manages application configuration in Redis (Vercel KV).
 * On first run, seeds Redis with default configuration from defaults.json.
 * 
 * Configuration includes:
 * - User roles and permissions
 * - Badge ID mappings (e.g., First Aid badge)
 * - Flexi column mappings (user-defined columns)
 * - Rate limiting settings
 * - Cache TTL values
 */

const CONFIG_KEY_PREFIX = 'config:'
const CONFIG_VERSION_KEY = `${CONFIG_KEY_PREFIX}version`
const CONFIG_INITIALIZED_KEY = `${CONFIG_KEY_PREFIX}initialized`

/**
 * Configuration Structure
 */
export interface AppConfig {
  version: string
  userRoles: {
    [role: string]: {
      permissions: string[]
      accessStrategy: string
    }
  }
  badgeMappings: Record<string, string>
  flexiColumnMappings: Record<string, string>
  rateLimit: {
    maxRequests: number
    windowMs: number
    safetyBuffer: number
  }
  cache: {
    defaultTTL: number
    startupDataTTL: number
    eventDataTTL: number
  }
}

/**
 * Check if configuration has been initialized in Redis
 */
export async function isConfigInitialized(): Promise<boolean> {
  try {
    const redis = getRedisClient()
    const initialized = await redis.get(CONFIG_INITIALIZED_KEY)
    return initialized === 'true'
  } catch (error) {
    logger.warn({ error }, 'Failed to check config initialization status')
    return false
  }
}

/**
 * Seed Redis with default configuration
 * Called on first run or after factory reset
 */
export async function seedDefaultConfig(): Promise<void> {
  try {
    const redis = getRedisClient()
    
    logger.info('Seeding default configuration to Redis')

    // Store each configuration section
    await redis.set(`${CONFIG_KEY_PREFIX}version`, defaultConfig.version)
    await redis.set(`${CONFIG_KEY_PREFIX}userRoles`, JSON.stringify(defaultConfig.userRoles))
    await redis.set(`${CONFIG_KEY_PREFIX}badgeMappings`, JSON.stringify(defaultConfig.badgeMappings))
    await redis.set(`${CONFIG_KEY_PREFIX}flexiColumnMappings`, JSON.stringify(defaultConfig.flexiColumnMappings))
    await redis.set(`${CONFIG_KEY_PREFIX}rateLimit`, JSON.stringify(defaultConfig.rateLimit))
    await redis.set(`${CONFIG_KEY_PREFIX}cache`, JSON.stringify(defaultConfig.cache))

    // Mark as initialized
    await redis.set(CONFIG_INITIALIZED_KEY, 'true')

    logger.info('Default configuration seeded successfully')
  } catch (error) {
    logger.error({ error }, 'Failed to seed default configuration')
    throw new Error('Configuration seeding failed')
  }
}

/**
 * Load configuration from Redis
 * If not initialized, seeds default configuration first
 */
export async function loadConfig(): Promise<AppConfig> {
  try {
    const redis = getRedisClient()

    // Check if config is initialized
    const initialized = await isConfigInitialized()
    if (!initialized) {
      logger.info('Configuration not initialized, seeding defaults')
      await seedDefaultConfig()
    }

    // Load configuration from Redis
    const [version, userRoles, badgeMappings, flexiColumnMappings, rateLimit, cache] = await Promise.all([
      redis.get(`${CONFIG_KEY_PREFIX}version`),
      redis.get(`${CONFIG_KEY_PREFIX}userRoles`),
      redis.get(`${CONFIG_KEY_PREFIX}badgeMappings`),
      redis.get(`${CONFIG_KEY_PREFIX}flexiColumnMappings`),
      redis.get(`${CONFIG_KEY_PREFIX}rateLimit`),
      redis.get(`${CONFIG_KEY_PREFIX}cache`),
    ])

    const config: AppConfig = {
      version: version || defaultConfig.version,
      userRoles: userRoles ? JSON.parse(userRoles) : defaultConfig.userRoles,
      badgeMappings: badgeMappings ? JSON.parse(badgeMappings) : defaultConfig.badgeMappings,
      flexiColumnMappings: flexiColumnMappings ? JSON.parse(flexiColumnMappings) : defaultConfig.flexiColumnMappings,
      rateLimit: rateLimit ? JSON.parse(rateLimit) : defaultConfig.rateLimit,
      cache: cache ? JSON.parse(cache) : defaultConfig.cache,
    }

    logger.info({ version: config.version }, 'Configuration loaded successfully')
    return config
  } catch (error) {
    logger.warn({ error }, 'Failed to load configuration, falling back to defaults')
    // Fallback to defaults if Redis is unavailable
    return defaultConfig as AppConfig
  }
}

/**
 * Update a specific configuration section
 */
export async function updateConfigSection<K extends keyof AppConfig>(
  section: K,
  value: AppConfig[K]
): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.set(`${CONFIG_KEY_PREFIX}${section}`, JSON.stringify(value))
    logger.info(`Configuration section '${section}' updated`)
  } catch (error) {
    logger.error({ error }, `Failed to update configuration section '${section}'`)
    throw new Error(`Configuration update failed: ${section}`)
  }
}

/**
 * Get a specific configuration section
 */
export async function getConfigSection<K extends keyof AppConfig>(section: K): Promise<AppConfig[K] | null> {
  try {
    const redis = getRedisClient()
    const value = await redis.get(`${CONFIG_KEY_PREFIX}${section}`)
    return value ? JSON.parse(value) : null
  } catch (error) {
    logger.warn({ error }, `Failed to get configuration section '${section}'`)
    return null
  }
}

/**
 * Factory reset: clear all configuration and reseed defaults
 */
export async function factoryResetConfig(): Promise<void> {
  try {
    const redis = getRedisClient()
    
    logger.info('Performing factory reset of configuration')

    // Delete all config keys
    const keys = await redis.keys(`${CONFIG_KEY_PREFIX}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }

    // Reseed defaults
    await seedDefaultConfig()

    logger.info('Factory reset completed successfully')
  } catch (error) {
    logger.error({ error }, 'Factory reset failed')
    throw new Error('Factory reset failed')
  }
}

/**
 * Get user role configuration
 */
export async function getUserRoleConfig(role: string): Promise<AppConfig['userRoles'][string] | null> {
  const userRoles = await getConfigSection('userRoles')
  return userRoles ? userRoles[role] : null
}

/**
 * Get badge mappings
 */
export async function getBadgeMappings(): Promise<Record<string, string>> {
  const mappings = await getConfigSection('badgeMappings')
  return mappings || {}
}

/**
 * Update badge mappings
 */
export async function updateBadgeMappings(mappings: Record<string, string>): Promise<void> {
  await updateConfigSection('badgeMappings', mappings)
}

/**
 * Get flexi column mappings
 */
export async function getFlexiColumnMappings(): Promise<Record<string, string>> {
  const mappings = await getConfigSection('flexiColumnMappings')
  return mappings || {}
}

/**
 * Update flexi column mappings
 */
export async function updateFlexiColumnMappings(mappings: Record<string, string>): Promise<void> {
  await updateConfigSection('flexiColumnMappings', mappings)
}
