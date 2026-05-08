/**
 * Screenshot adapter — load a screenshot file and encode it as a base64
 * image content block for the Anthropic messages API.
 *
 * Supported formats: PNG, JPEG, GIF, WEBP.
 * The media_type is inferred from the file extension; the file is read
 * from disk and base64-encoded. No validation of the actual image bytes
 * is performed — the SDK will error if the payload is malformed.
 */

import { readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';

/** Anthropic API per-image limit. Reject earlier so users see a clear error. */
const MAX_SCREENSHOT_BYTES = 20 * 1024 * 1024;

/** Anthropic SDK image content block (base64 variant). */
export interface ImageContentBlock {
  type: 'image';
  source: {
    type: 'base64';
    media_type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
    data: string;
  };
}

const EXT_TO_MEDIA_TYPE: Record<string, ImageContentBlock['source']['media_type']> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

/**
 * Infer the Anthropic media_type from a file extension.
 * Throws when the extension is not a supported image type.
 */
export function inferMediaType(filePath: string): ImageContentBlock['source']['media_type'] {
  const ext = extname(filePath).toLowerCase();
  const mediaType = EXT_TO_MEDIA_TYPE[ext];
  if (!mediaType) {
    throw new Error(
      `Agent.screenshot: unsupported image extension "${ext}" for file "${filePath}". ` +
        'Supported: .png, .jpg, .jpeg, .gif, .webp',
    );
  }
  return mediaType;
}

/**
 * Load a screenshot from disk and return an Anthropic image content block.
 * The file is read as binary and base64-encoded. Files over 20 MB are
 * rejected before encoding to avoid a memory spike on a doomed request.
 */
export async function loadScreenshot(filePath: string): Promise<ImageContentBlock> {
  const media_type = inferMediaType(filePath);
  const { size } = await stat(filePath);
  if (size > MAX_SCREENSHOT_BYTES) {
    const mb = (size / 1024 / 1024).toFixed(1);
    throw new Error(
      `Agent.screenshot: file "${filePath}" is ${mb} MB — exceeds Anthropic API limit of 20 MB. Resize or compress before passing.`,
    );
  }
  const buffer = await readFile(filePath);
  const data = buffer.toString('base64');
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type,
      data,
    },
  };
}
