import { cn } from '../lib/cn';

/**
 * Brasão da prefeitura.
 *
 * O arquivo tem fundo transparente, mas a ponte e o texto do logo são PRETOS —
 * eles somem sobre o azul institucional da capa e do painel, e sobre a
 * superfície do app do cidadão em tema escuro. Por isso ele é servido dentro de
 * uma placa clara, e não solto.
 *
 * A placa, e não uma versão recolorida do logo, porque brasão de município é
 * identidade oficial: reproduzir com as cores trocadas é alterar a marca. A
 * placa preserva o arquivo exatamente como foi publicado e resolve o contraste
 * de um jeito que o leitor reconhece — é como um selo aplicado sobre o fundo.
 *
 * Em superfície clara a placa branca praticamente desaparece, então o mesmo
 * componente serve aos dois temas sem ramificar por `useTheme`.
 *
 * O arquivo vive no `public/` de cada app e é referenciado por URL absoluta.
 * São dois arquivos de 5 KB em vez de um, e é o preço de não fazer os dois
 * `vite.config.ts` e os dois `tsconfig.json` aprenderem a importar binário — o
 * que exigiria declaração de módulo para `*.png` em `packages/ui` e abriria
 * conflito com a que os apps já herdam de `vite/client`.
 */
export interface PrefeituraLogoProps {
  /** Largura da placa. O arquivo tem 293px, então acima de ~140px ele começa a
   *  perder nitidez em tela de alta densidade. */
  size?: number;
  className?: string;
}

/**
 * O logo NÃO é decorativo em nenhum lugar onde está aplicado hoje, e por isso
 * não há como desligar o texto alternativo: "Rio Branco" não aparece escrito em
 * nenhuma dessas telas. O brasão é a única coisa que diz de qual município é o
 * serviço — some para quem usa leitor de tela se for marcado como enfeite, e o
 * mesmo vale para quem enxerga, porque nesse tamanho o texto dentro do logo não
 * é legível.
 */
export function PrefeituraLogo({ size = 96, className }: PrefeituraLogoProps) {
  return (
    <span
      className={cn('inline-flex items-center justify-center bg-white shadow-panel', className)}
      /* Respiro e raio PROPORCIONAIS, não fixos: com `p-2.5` e `rounded-card`
         literais, uma placa de 44px sobrava 24px de imagem — a logo virava um
         borrão colorido — enquanto a de 104px ficava com folga de menos. */
      style={{ width: size, padding: Math.round(size * 0.08), borderRadius: Math.round(size * 0.18) }}
    >
      <img
        src="/prefeitura-rio-branco.png"
        alt="Prefeitura de Rio Branco"
        width={293}
        height={244}
        className="h-auto w-full"
      />
    </span>
  );
}
