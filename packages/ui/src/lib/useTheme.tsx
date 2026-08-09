import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/**
 * Mesma chave nos dois apps, para que em produção — onde ambos ficam atrás do
 * mesmo proxy, na mesma origem — a escolha valha para os dois.
 *
 * Em desenvolvimento isso NÃO acontece: `localStorage` é por origem e as portas
 * 5173 e 5174 são origens distintas, então cada app guarda a sua preferência.
 * É esperado, não um bug.
 */
const STORAGE_KEY = 'zeladoria-theme';

const MEDIA = '(prefers-color-scheme: dark)';

/**
 * Cores da barra do navegador por tema. Precisam bater com `--surface` do
 * tokens.css — se divergirem, o topo da tela no celular fica de uma cor e o
 * conteúdo logo abaixo de outra.
 */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#FFFFFF',
  dark: '#0B1220',
};

interface ThemeContextValue {
  /** O que o usuário escolheu — pode ser 'system'. */
  preference: ThemePreference;
  /** O que está valendo agora — nunca 'system'. */
  theme: ResolvedTheme;
  setPreference: (next: ThemePreference) => void;
  /** Alterna entre claro e escuro, saindo de 'system' para o oposto do atual. */
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // Safari em modo privado lança ao ler localStorage. Cai para 'system'.
  }
  return 'system';
}

function systemTheme(): ResolvedTheme {
  return typeof window !== 'undefined' && window.matchMedia(MEDIA).matches ? 'dark' : 'light';
}

function resolve(pref: ThemePreference): ResolvedTheme {
  return pref === 'system' ? systemTheme() : pref;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolve(readStored()));

  /* Aplica no <html>. O script anti-flash do index.html já fez isto antes do
     primeiro paint; aqui é para as trocas seguintes. */
  useEffect(() => {
    const next = resolve(preference);
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');

    /* A meta theme-color com `media` só reage ao SO. Quando o usuário força um
       tema contra a preferência do sistema, é preciso escrever a cor na mão. */
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (meta) meta.content = THEME_COLOR[next];
  }, [preference]);

  /* Só escuta o sistema enquanto a preferência for 'system' — se o usuário
     escolheu um tema, mudança no SO não deve arrastar a interface junto. */
  useEffect(() => {
    if (preference !== 'system') return;
    const mq = window.matchMedia(MEDIA);
    const onChange = () => {
      const next = systemTheme();
      setTheme(next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
      if (meta) meta.content = THEME_COLOR[next];
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Sem persistência é degradação aceitável; o tema vale para esta sessão.
    }
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolve(readStored()) === 'dark' ? 'light' : 'dark');
  }, [setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme, setPreference, toggle }),
    [preference, theme, setPreference, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.');
  return ctx;
}

/**
 * Script que roda antes do primeiro paint para evitar o flash branco.
 *
 * Vai inline no index.html de cada app, não como módulo: precisa executar
 * antes do React montar, e antes até do CSS pintar o body.
 */
export const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');var d=t==='dark'||(t!=='light'&&matchMedia('${MEDIA}').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})()`;
