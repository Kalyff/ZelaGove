import type { ReactNode } from 'react';

/**
 * Requisito 5.1: em desktop o app aparece dentro de uma moldura de ~420px.
 * A moldura só existe a partir de `sm` — em celular real ela seria um bug
 * visual, roubando altura útil de uma tela que já é pequena.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] justify-center sm:items-center sm:py-8">
      {/* Altura: 860px é o alvo, mas limitada ao que a janela realmente tem.
          Fixa em 860px, a moldura transbordava em qualquer laptop com menos de
          ~900px de viewport e a página inteira ganhava barra de rolagem — a
          moldura de aparelho rolando dentro da página é justamente o efeito que
          ela deveria evitar.

          No escuro a sombra projetada não lê contra um fundo quase preto — o
          recorte do aparelho vem de um anel de 1px, não de elevação. */}
      <div className="relative flex h-[100dvh] w-full max-w-[420px] flex-col overflow-hidden bg-surface sm:h-[min(860px,calc(100dvh-4rem))] sm:rounded-[2rem] sm:shadow-device dark:sm:shadow-none dark:sm:ring-1 dark:sm:ring-white/10">
        {children}
      </div>
    </div>
  );
}

/** Faixa institucional verde+amarela presente em todas as telas. */
export function GovStripe() {
  return (
    <div className="flex h-1.5 shrink-0" aria-hidden>
      <div className="w-2/3 bg-stripe-a" />
      <div className="w-1/3 bg-stripe-b" />
    </div>
  );
}
