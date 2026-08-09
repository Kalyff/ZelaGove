import { IconButton, IconExit } from '@zeladoria/ui';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

/**
 * Sair, no cabeçalho.
 *
 * Saiu da barra inferior quando ela ganhou um segundo destino: ali ficava
 * encostado nos botões de navegação, e sair da conta é a última coisa que se
 * quer acertar por engano procurando uma tela. É a mesma separação que a
 * sidebar do painel já fazia.
 *
 * Componente, e não trecho copiado nas duas páginas, porque o `signOut` seguido
 * de `replace: true` é o par que evita o botão voltar do navegador cair numa
 * tela autenticada morta.
 */
export function SignOutButton() {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <IconButton
      label="Sair da conta"
      onClick={async () => {
        await signOut();
        navigate('/entrar', { replace: true });
      }}
    >
      <IconExit className="h-5 w-5" />
    </IconButton>
  );
}
