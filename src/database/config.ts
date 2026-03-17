/**
 * Database - 配置
 * 从环境变量读取数据库开关和连接信息
 */

export interface DatabaseConfig {
  /** 是否启用持久化历史记录 */
  enabled: boolean
  /** Supabase 项目 URL */
  supabaseUrl: string
  /** Supabase anon/service key */
  supabaseKey: string
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    enabled: process.env.ENABLE_HISTORY_DB === 'true',
    supabaseUrl: process.env.SUPABASE_URL?.trim() || '',
    supabaseKey: process.env.SUPABASE_KEY?.trim() || '',
  }
}

/**
 * 检查数据库配置是否就绪
 */
export function isDatabaseReady(): boolean {
  const cfg = getDatabaseConfig()
  return cfg.enabled && Boolean(cfg.supabaseUrl) && Boolean(cfg.supabaseKey)
}
