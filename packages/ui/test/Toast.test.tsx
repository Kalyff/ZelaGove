import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LazyMotion, domAnimation } from 'framer-motion';
import { describe, expect, it } from 'vitest';
import { ToastProvider, useToast, type ToastDurations } from '../src/primitives/Toast';

function Disparador() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast.success('Protocolo copiado.')}>
        Sucesso
      </button>
      <button type="button" onClick={() => toast.error('Servidor indisponível.')}>
        Erro
      </button>
      <input aria-label="Campo" />
    </>
  );
}

function Demo({ durations }: { durations?: ToastDurations } = {}) {
  return (
    <LazyMotion features={domAnimation}>
      <ToastProvider durations={durations}>
        <Disparador />
      </ToastProvider>
    </LazyMotion>
  );
}

describe('Toast', () => {
  it('mostra a mensagem disparada', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Sucesso' }));
    expect(await screen.findByText('Protocolo copiado.')).toBeInTheDocument();
  });

  it('NÃO rouba o foco', async () => {
    const user = userEvent.setup();
    render(<Demo />);

    const campo = screen.getByLabelText('Campo');
    campo.focus();
    await user.click(screen.getByRole('button', { name: 'Sucesso' }));
    await screen.findByText('Protocolo copiado.');

    /* Um aviso que rouba o foco interrompe quem está no meio de um formulário.
       O anúncio para leitor de tela vem da região aria-live do Announcer, não
       daqui — por isso a pilha é aria-hidden. */
    await user.click(campo);
    expect(campo).toHaveFocus();
  });

  it('empilha vários avisos', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Sucesso' }));
    await user.click(screen.getByRole('button', { name: 'Erro' }));

    expect(await screen.findByText('Protocolo copiado.')).toBeInTheDocument();
    expect(screen.getByText('Servidor indisponível.')).toBeInTheDocument();
  });

  it('pode ser dispensado no X', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Sucesso' }));
    await screen.findByText('Protocolo copiado.');

    await user.click(screen.getByRole('button', { name: 'Fechar aviso' }));
    await waitFor(() =>
      expect(screen.queryByText('Protocolo copiado.')).not.toBeInTheDocument(),
    );
  });

  it('some sozinho, e o erro dura mais que o sucesso', async () => {
    /* Tempos encolhidos via prop, com timers REAIS. Timers falsos travam aqui:
       o framer agenda em requestAnimationFrame e o userEvent tem o próprio
       relógio — os três juntos se esperam mutuamente. As proporções reais
       (sucesso 3,5s < erro 6s) estão no DURATION do componente. */
    const user = userEvent.setup();
    render(<Demo durations={{ success: 80, error: 600 }} />);

    await user.click(screen.getByRole('button', { name: 'Sucesso' }));
    await user.click(screen.getByRole('button', { name: 'Erro' }));
    expect(screen.getByText('Protocolo copiado.')).toBeInTheDocument();

    // O sucesso sai primeiro; o erro continua na tela.
    await waitFor(() =>
      expect(screen.queryByText('Protocolo copiado.')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Servidor indisponível.')).toBeInTheDocument();

    // E depois o erro também sai.
    await waitFor(
      () => expect(screen.queryByText('Servidor indisponível.')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it('useToast fora do provider vira no-op em vez de lançar', () => {
    /* Um aviso perdido é degradação; uma tela que quebra por causa dele, não. */
    expect(() => render(<Disparador />)).not.toThrow();
  });
});
