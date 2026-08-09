import multer from 'multer';
import type { Request } from 'express';
import { Errors } from '../../http/errors';
import { photoStorage } from '../../infra/storage';

/**
 * Upload em memória: o arquivo passa pela API, que recomprime com sharp antes
 * de gravar (§4.5 do plano). Presigned upload direto é a evolução quando o
 * volume justificar.
 */
export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

export async function savePhotoIfPresent(req: Request, prefix: string): Promise<string | null> {
  if (!req.file) return null;
  try {
    return await photoStorage.save(req.file.buffer, prefix);
  } catch {
    // sharp falha em qualquer coisa que não seja imagem decodificável — isso
    // vale mais que checar a extensão do arquivo enviado.
    throw Errors.invalidPhoto();
  }
}
