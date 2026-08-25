function readEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    // Log at startup so the missing var is visible in Vercel logs, but don't
    // crash the entire process — individual routes will handle missing values.
    console.error(`[env] Missing environment variable: ${name}`);
    return '';
  }
  return value;
}

export const env = {
  supabaseUrl: readEnv('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  openAiApiKey: process.env.OPENAI_API_KEY ?? ''
};
