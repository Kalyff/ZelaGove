import { useEffect, useState } from 'react';

/**
 * Foto opcional com prévia — usada na conclusão e nas observações.
 *
 * Controlado: o arquivo mora em quem usa, que é quem decide quando limpar. A
 * prévia é derivada dele e o object URL é revogado a cada troca, para não vazar
 * memória com o modal aberto por muito tempo.
 */
export function PhotoPicker({
  label,
  previewAlt,
  file,
  onChange,
  compact = false,
}: {
  label: string;
  previewAlt: string;
  file: File | null;
  onChange: (file: File | null) => void;
  compact?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <span className="field-label">{label}</span>
      <label className="block cursor-pointer overflow-hidden rounded-field border-2 border-dashed border-line-strong bg-surface-sunken text-center">
        {preview ? (
          <img
            src={preview}
            alt={previewAlt}
            className={`${compact ? 'h-28' : 'h-40'} w-full object-cover`}
          />
        ) : (
          <span
            className={`flex ${compact ? 'h-14' : 'h-24'} items-center justify-center text-sm text-content-tertiary`}
          >
            Escolher imagem
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          /* Zera o valor: escolher o MESMO arquivo depois de limpar o formulário
             não dispararia `change` de novo. */
          onClick={(e) => (e.currentTarget.value = '')}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
