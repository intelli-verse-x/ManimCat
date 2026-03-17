/**
 * Database - Supabase 客户端
 * 懒初始化，仅在 ENABLE_HISTORY_DB=true 时创建
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getDatabaseConfig, isDatabaseReady } from './config'

let _client: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端实例（单例）
 * 如果数据库未启用或配置不完整，返回 null
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!isDatabaseReady()) {
    return null
  }

  if (!_client) {
    const cfg = getDatabaseConfig()
    _client = createClient(cfg.supabaseUrl, cfg.supabaseKey)
    console.log('[Database] Supabase client initialized')
  }

  return _client
}
