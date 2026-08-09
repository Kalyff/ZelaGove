import { cn } from '../lib/cn';
import { IconMonitor, IconMoon, IconSun } from '../icons';
import { useTheme, type ThemePreference } from '../lib/useTheme';

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof IconSun }[] = [
  { value: 'light', label: 'Tema claro', Icon: IconSun },
  { value: 'dark', label: 'Tema escuro', Icon: IconMoon },
  { value: 'system', label: 'Seguir o sistema', Icon: IconMonitor },
];

/**
 * Seletor de tema em três estados.
 *
 * É um grupo de rádio, não um botão que alterna: com só dois estados não há
 * como voltar para "seguir o sistema" depois de escolher um tema, e o usuário
 * fica preso ao claro quando o aparelho vira para o escuro à noite.
 *
 * `onImage` serve para as superfícies de chrome escuro (Gateway, sidebar), onde
 * o contraste vem do par `chrome`, não das superfícies do tema.
 */
export function ThemeToggle({
  className,
  onChrome = false,
}: {
  className?: string;
  onChrome?: boolean;
}) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema da interface"
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full p-0.5',
        onChrome ? 'bg-white/10' : 'bg-surface-sunken',
        className,
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150',
              'cursor-pointer touch-manipulation',
              active
                ? onChrome
                  ? 'bg-white/20 text-chrome'
                  : 'bg-surface text-accent shadow-card'
                : onChrome
                  ? 'text-chrome-tertiary hover:text-chrome'
                  : 'text-content-tertiary hover:text-content',
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
