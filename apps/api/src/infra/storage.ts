import { randomUUID } from 'node:crypto';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Storage fica atrás desta interface de propósito: trocar MinIO por S3, ou por
 * disco local, não deve tocar em nenhuma regra de negócio.
 */
export interface PhotoStorage {
  save(buffer: Buffer, prefix: string): Promise<string>;
  urlFor(key: string | null): Promise<string | null>;
}

const client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
});

export const photoStorage: PhotoStorage = {
  async save(buffer, prefix) {
    // sharp recomprime e, por padrão, NÃO copia metadados: isso remove o EXIF,
    // que em foto de celular carrega GPS e modelo do aparelho. Não é cosmético:
    // é a diferença entre guardar e não guardar dado pessoal extra.
    // Também serve de validação — arquivo que não é imagem falha aqui.
    const processed = await sharp(buffer)
      .rotate() // aplica a orientação do EXIF antes de descartá-lo
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `${prefix}/${randomUUID()}.jpg`;

    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: processed,
        ContentType: 'image/jpeg',
      })
    );

    return key;
  },

  async urlFor(key) {
    if (!key) return null;
    // URL assinada de vida curta. Limitação conhecida: uma vez emitida, a URL
    // vale para quem a tiver, independente de papel. Aceitável no protótipo;
    // em produção, avaliar servir a foto por endpoint autenticado.
    return getSignedUrl(client, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
      expiresIn: env.PHOTO_URL_TTL_SECONDS,
    });
  },
};

export async function ensureBucket(): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }));
    logger.info({ bucket: env.S3_BUCKET }, 'Bucket criado');
  }
}
