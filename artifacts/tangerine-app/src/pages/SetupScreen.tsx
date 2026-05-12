import { Database } from "lucide-react";

export function SetupScreen({ error }: { error?: string | null }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-6">
        <Database className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Configurazione richiesta</h1>
      <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
        Tangerine usa Supabase (free tier) per sincronizzare i dati su tutti i tuoi device.
        Imposta queste due variabili d'ambiente, poi ricarica.
      </p>
      {error && (
        <div className="w-full max-w-md mb-4 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-xs text-destructive">
          <div className="font-semibold mb-1">Errore al boot</div>
          <div className="font-mono break-words">{error}</div>
          {error.toLowerCase().includes("anonymous") && (
            <div className="mt-2 text-foreground">
              → Vai su <span className="text-primary">Supabase → Authentication → Providers</span> e abilita
              <span className="text-primary"> Anonymous sign-ins</span>.
            </div>
          )}
        </div>
      )}
      <div className="bg-card border border-card-border rounded-2xl p-4 w-full max-w-md mb-6 font-mono text-xs">
        <div>VITE_SUPABASE_URL=https://xxx.supabase.co</div>
        <div>VITE_SUPABASE_ANON_KEY=eyJhbGciOi...</div>
      </div>
      <div className="text-xs text-muted-foreground text-center max-w-md space-y-1">
        <p>1. Crea un progetto su <span className="text-primary">supabase.com</span> (free tier).</p>
        <p>2. Esegui <span className="text-primary font-mono">supabase/migrations/0001_init.sql</span> dal SQL Editor.</p>
        <p>3. Su Authentication → Providers abilita <span className="text-primary">Anonymous sign-ins</span> e <span className="text-primary">Email (magic link)</span>.</p>
        <p>4. Deploy delle Edge Function: <span className="text-primary font-mono">supabase functions deploy</span>.</p>
        <p>5. Aggiungi le due env var su Vercel e in locale, poi riavvia.</p>
      </div>
    </div>
  );
}
