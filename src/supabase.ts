import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SupabaseConfig } from './types.ts';

const STORAGE_KEY_SUPABASE_CONFIG = 'pairpay_supabase_config_v1';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  // 1. 環境変数からの取得を優先
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
    return {
      url: envUrl.trim().replace(/\/+$/, ''),
      anonKey: envKey.trim(),
    };
  }

  // 2. LocalStorageからの取得
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.url === 'string' && typeof parsed.anonKey === 'string') {
        return {
          url: parsed.url.trim().replace(/\/+$/, ''),
          anonKey: parsed.anonKey.trim(),
        };
      }
    }
  } catch (e) {
    console.error('Failed to load Supabase config from storage', e);
  }

  return null;
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  const sanitizedConfig: SupabaseConfig = {
    url: (config.url || '').trim().replace(/\/+$/, ''),
    anonKey: (config.anonKey || '').trim(),
  };
  localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(sanitizedConfig));
  supabaseClient = null; // キャッシュクリア
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE_CONFIG);
  supabaseClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const config = getSupabaseConfig();
  if (!config || !config.url || !config.anonKey) {
    return null;
  }

  try {
    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    return supabaseClient;
  } catch (e) {
    console.error('Failed to initialize Supabase client', e);
    return null;
  }
}
