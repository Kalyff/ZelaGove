import { IconButton, IconCamera, IconClose } from '@zeladoria/ui';
import { useEffect, useRef, useState } from 'react';

/** Casa com o limite do servidor (`PHOTO_TOO_LARGE`). Validar aqui evita uma
 *  subida inteira de foto de celular por 3G para receber erro no fim. */
const MAX_BYTES = 5 * 1024 * 1024;

export function PhotoUpload({
  onChange,
  error,
}: {
  onChange: (file: File | null) => void;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  /* O componente antigo revogava a URL anterior ao trocar de foto, mas nunca
     ao desmontar — cada abertura de formulário abandonava um blob na memória. */
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleFile(file: File | null) {
    setLocalError(null);

    if (file) {
      if (!file.type.startsWith('image/')) {
        setLocalError('Escolha um arquivo de imagem.');
        return;
      }
      if (file.size > MAX_BYTES) {
        const mb = (file.size / 1024 / 1024).toFixed(1);
        setLocalError(`A foto tem ${mb} MB. O limite é 5 MB — tente uma resolução menor.`);
        return;
      }
    }

    setPreview((old) => {
      if (old) URL.revokeObjectURL(old);
      return file ? URL.createObjectURL(file) : null;
    });
    setFileName(file?.name ?? null);
    onChange(file);
  }

  function clear() {
    handleFile(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const shownError = error ?? localError;

  return (
    <div>
      <span className="mb-1.5 block font-display text-xs font-bold uppercase tracking-[0.12em] text-content-secondary">
        Foto do problema
      </span>

      {/* Altura FIXA nos dois estados. Antes o vazio tinha 160px e o preenchido
          192px: escolher a foto empurrava o formulário inteiro 32px para baixo,
          justo quando o dedo já estava indo para o próximo campo. */}
      <div className="relative h-48">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-full w-full overflow-hidden rounded-card border-2 border-dashed border-line-strong bg-surface-sunken transition active:scale-[0.98]"
        >
          {preview ? (
            <img
              src={preview}
              alt="Prévia da foto selecionada"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-2 text-content-tertiary">
              <IconCamera className="h-8 w-8" />
              <span className="text-sm font-medium">Tirar foto ou escolher do aparelho</span>
            </span>
          )}
        </button>

        {preview && (
          <IconButton
            label="Remover foto"
            variant="solid"
            onClick={clear}
            className="absolute right-2 top-2 bg-surface/90 backdrop-blur"
          >
            <IconClose className="h-5 w-5" />
          </IconButton>
        )}
      </div>

      {fileName && !shownError && (
        <p className="mt-1.5 truncate text-xs text-content-tertiary">{fileName}</p>
      )}
      {shownError && (
        <p role="alert" className="mt-1.5 text-xs font-medium text-danger-onSoft">
          {shownError}
        </p>
      )}

      {/* capture="environment" abre a câmera traseira direto no celular e cai
          no seletor de arquivos no desktop — sem biblioteca nenhuma. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
