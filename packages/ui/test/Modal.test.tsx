import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LazyMotion, domAnimation } from 'framer-motion';
import { useState, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Button } from '../src/primitives/Button';
import { Modal } from '../src/primitives/Modal';
import { Textarea } from '../src/primitives/Input';

/**
 * O `LazyMotion` espelha o root dos apps. Sem ele o `AnimatePresence` não tem
 * como concluir a animação de saída, e o nó do modal nunca desmontaria — o
 * teste falharia por um motivo que não existe em produção.
 */
function Wrapper({ children }: { children: ReactNode }) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}

function Demo({
  dismissOnBackdrop = true,
  comCampo = false,
}: {
  dismissOnBackdrop?: boolean;
  comCampo?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Wrapper>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir
      </button>
      {/* Focável FORA do modal: se o Tab escapar do trap, ele recebe o foco e
          o teste detecta. */}
      <button type="button">Fora do modal</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Detalhes"
        dismissOnBackdrop={dismissOnBackdrop}
        footer={<Button onClick={() => setOpen(false)}>Confirmar</Button>}
      >
        {comCampo ? <Textarea data-autofocus aria-label="Observação" /> : <p>Conteúdo</p>}
      </Modal>
    </Wrapper>
  );
}

const dialogo = () => screen.queryByRole('dialog');

describe('Modal', () => {
  it('não renderiza nada enquanto fechado', () => {
    render(<Demo />);
    expect(dialogo()).not.toBeInTheDocument();
  });

  it('monta em portal, fora da árvore do gatilho', async () => {
    const user = userEvent.setup();
    const { container } = render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const d = dialogo()!;
    expect(d).toBeInTheDocument();
    expect(d).toHaveAttribute('aria-modal', 'true');
    expect(d).toHaveAccessibleName('Detalhes');
    // O portal é o que garante que o modal não seja recortado por um
    // `overflow: hidden` de qualquer ancestral.
    expect(container).not.toContainElement(d);
  });

  it('move o foco para dentro ao abrir', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(dialogo()).toContainElement(document.activeElement as HTMLElement);
  });

  it('prefere [data-autofocus] ao primeiro focável', async () => {
    const user = userEvent.setup();
    render(<Demo comCampo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    /* Regressão real: o trap focava o botão Fechar do cabeçalho. Num modal de
       formulário isso significa abrir o diálogo com o cursor no botão de
       desistir, em vez de no campo obrigatório.
       E é `data-autofocus`, não o `autoFocus` do React: aquele é aplicado
       chamando `.focus()` e não deixa atributo no DOM para o trap consultar. */
    expect(screen.getByLabelText('Observação')).toHaveFocus();
  });

  it('mantém o Tab preso: do último volta para o primeiro', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const fechar = screen.getByRole('button', { name: 'Fechar' });
    const confirmar = screen.getByRole('button', { name: 'Confirmar' });

    confirmar.focus();
    await user.tab();
    expect(fechar).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Fora do modal' })).not.toHaveFocus();
  });

  it('mantém o Shift+Tab preso: do primeiro vai para o último', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    screen.getByRole('button', { name: 'Fechar' }).focus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Confirmar' })).toHaveFocus();
  });

  it('Escape fecha', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialogo()).not.toBeInTheDocument());
  });

  it('devolve o foco a quem abriu', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    const gatilho = screen.getByRole('button', { name: 'Abrir' });
    await user.click(gatilho);
    await user.keyboard('{Escape}');

    /* Sem isto o foco cai no <body> e quem navega por teclado recomeça do topo
       da página a cada modal fechado. */
    await waitFor(() => expect(gatilho).toHaveFocus());
  });

  it('trava o scroll do body enquanto aberto e destrava ao fechar', async () => {
    const user = userEvent.setup();
    render(<Demo />);
    expect(document.body.style.overflow).toBe('');

    await user.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.body.style.overflow).toBe(''));
  });

  it('fecha ao clicar no fundo quando permitido', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Demo />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const fundo = baseElement.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(fundo);
    await waitFor(() => expect(dialogo()).not.toBeInTheDocument());
  });

  it('NÃO fecha no fundo em confirmação destrutiva, mas Escape ainda fecha', async () => {
    const user = userEvent.setup();
    const { baseElement } = render(<Demo dismissOnBackdrop={false} />);
    await user.click(screen.getByRole('button', { name: 'Abrir' }));

    const fundo = baseElement.querySelector('[aria-hidden="true"]') as HTMLElement;
    await user.click(fundo);
    expect(dialogo()).toBeInTheDocument();

    /* Escape continua funcionando: ele é o par de teclado do botão Cancelar.
       Cancelar é uma escolha; clicar fora, um acidente — e o texto digitado
       vai para uma linha do tempo imutável. */
    await user.keyboard('{Escape}');
    await waitFor(() => expect(dialogo()).not.toBeInTheDocument());
  });
});
