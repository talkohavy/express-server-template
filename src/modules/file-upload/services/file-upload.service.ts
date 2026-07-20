import { createWriteStream } from 'fs';
import { join } from 'path';
import { extractBoundary, parseMultipartHeaders } from '../utils';
import type { WriteStream } from 'fs';
import type { Request } from 'express';
import type { FileMetadata, UploadResult } from '../types';

export class FileUploadService {
  /**
   * Whitelist of allowed Content-Types for binary uploads.
   * Modify this array to control what file types can be uploaded.
   */
  private readonly allowedContentTypes = [
    // Generic Binary
    'application/octet-stream',
    // Image Files
    'image/jpeg',
    'image/png',
    // Document Files
    'application/pdf',
    'application/msword',
    // Archive Files
    'application/zip',
    'application/gzip',
    // Audio Files
    'audio/mp3',
    // Video Files
    'video/mp4',
    'video/mpeg',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    // Text Files
    'text/plain',
    'text/csv',
    'application/json',
  ];

  /**
   * Binary uploads can have various Content-Type values depending on the file type. Here are the common ones:
   *
   * Generic Binary
   * - application/octet-stream
   *
   * Image Files
   * - image/jpeg
   * - image/png
   * - image/gif
   * - image/webp
   * - image/svg+xml
   *
   * Document Files
   * - application/pdf
   * - application/msword
   * - application/vnd.openxmlformats-officedocument.wordprocessingml.document (for .docx)
   * - application/vnd.ms-excel
   * - application/vnd.openxmlformats-officedocument.spreadsheetml.sheet (for .xlsx)
   * - application/vnd.ms-powerpoint
   * - application/vnd.openxmlformats-officedocument.presentationml.presentation (for .pptx)
   *
   * Archive Files
   * - application/zip
   * - application/msword
   *
   * Audio Files
   * - audio/mpeg
   * - audio/mp3
   * - audio/aac
   * - audio/flac
   * - audio/webm
   * - audio/wav
   * - audio/ogg
   *
   * Video Files
   * - video/mp4
   * - video/mpeg
   * - video/webm
   * - video/ogg
   * - video/quicktime (.mov)
   * - video/x-msvideo (.avi)
   * - video/x-ms-wmv (.wmv)
   *
   * Text Files
   * - text/plain
   * - text/csv
   * - application/json
   *
   */
  async handleBinaryUpload(req: Request): Promise<UploadResult> {
    const contentType = req.headers['content-type'] || '';

    if (!contentType) throw new Error('Missing content-type header');

    if (!this.allowedContentTypes.includes(contentType)) {
      throw new Error(
        `Content-Type '${contentType}' is not allowed. Allowed types: ${this.allowedContentTypes.join(', ')}`,
      );
    }

    const filename = (req.headers['x-filename'] as string) || 'uploaded-file';
    const filePath = join(process.cwd(), filename);

    const metadata: FileMetadata = {
      filename,
      fileType: contentType,
      uploadPath: filePath,
      uploadTimestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const writeStream = createWriteStream(filePath);

      req.pipe(writeStream);

      writeStream.on('finish', () => {
        resolve({
          message: 'File uploaded successfully',
          metadata,
        });
      });

      writeStream.on('error', reject);
    });
  }

  /**
   * Handles multipart form data file upload
   *
   * HOW IT WORKS:
   * Multipart form data arrives as a stream of chunks over the network. Each chunk contains
   * binary data that may include parts of file headers, file content, or boundary markers.
   * Since chunks can arrive at arbitrary positions (e.g., a boundary marker could be split
   * across multiple chunks), we need to accumulate data in a buffer until we have enough
   * to parse complete parts.
   *
   * WHY USE A BUFFER:
   * - Network data arrives in unpredictable chunk sizes
   * - A single chunk might contain partial boundary markers or incomplete headers
   * - We need to accumulate data until we can identify complete multipart parts
   * - The buffer stores unprocessed data between chunks
   *
   * WHAT HAPPENS:
   * 1. Each 'data' event adds new chunk to buffer (concatenation)
   * 2. We scan buffer for boundary markers (--{boundary})
   * 3. When found, we extract headers (Content-Disposition, Content-Type) between
   *    the boundary and \r\n\r\n marker
   * 4. We create a write stream for the file and store its metadata
   * 5. We extract file content between current boundary and next boundary
   * 6. We write content to file stream and remove processed data from buffer
   * 7. Repeat until no more complete parts can be extracted
   * 8. Any remaining partial data stays in buffer for next chunk
   * 9. On 'end' event, close all streams and return metadata
   *
   * @example
   *
   * Here is an example of a multipart/form-data request with two files:
   *
   * ```
   * POST /upload HTTP/1.1
   * Host: example.com
   * Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW
   * Content-Length: 12345
   *
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW
   * Content-Disposition: form-data; name="title"
   *
   * My Document Title
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW
   * Content-Disposition: form-data; name="file"; filename="document.pdf"
   * Content-Type: application/pdf
   *
   * %PDF-1.4
   * %����
   * 1 0 obj
   * << /Type /Catalog /Pages 2 0 R >>
   * endobj
   * [... binary PDF data continues ...]
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW
   * Content-Disposition: form-data; name="image"; filename="photo.jpg"
   * Content-Type: image/jpeg
   *
   * ����JFIF��C��
   * [... binary JPEG data ...]
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW--
   * ```
   *
   * -------------------------------
   * Let's break down the structure:
   * -------------------------------
   *
   * 1. Main Headers
   *    `Content-Type: multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW`
   *    • Tells you it's multipart data
   *    • The `boundary` string separates each part
   *
   * 2. Each Part Structure
   *
   * ```
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW          ← Boundary marker (starts with --)
   * Content-Disposition: form-data; name="file"; filename="document.pdf"
   * Content-Type: application/pdf
   *                                                  ← Empty line (\r\n\r\n)
   * [Binary file content here]                       ← Actual file bytes
   * ```
   *
   * 3. Text Field Example
   *
   * ```
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW
   * Content-Disposition: form-data; name="title"
   *
   * My Document Title
   * ```
   *
   * 4. Final Boundary
   *
   * ```
   * ------WebKitFormBoundary7MA4YWxkTrZu0gW--        ← Ends with extra --
   * ```
   *
   * @param req - Express request object (readable stream)
   * @returns Promise resolving to upload result with file metadata
   */
  async handleMultipartUpload(req: Request): Promise<UploadResult> {
    const contentType = req.headers['content-type'] || '';

    if (!contentType.startsWith('multipart/form-data')) throw new Error('Missing content-type header');

    const boundary = extractBoundary(contentType);

    if (!boundary) throw new Error('Invalid multipart/form-data content-type header! boundary missing.');

    return new Promise((resolve, reject) => {
      const bufferRef: { current: Buffer } = { current: Buffer.alloc(0) };
      const metadataArr: Array<FileMetadata> = [];
      const fileStreamRef: { current: WriteStream | null } = { current: null };

      req.on('data', (chunk) => {
        bufferRef.current = Buffer.concat([bufferRef.current, chunk]);
        this.processMultipartBuffer(bufferRef, boundary, metadataArr, fileStreamRef);
      });

      req.on('end', () => {
        fileStreamRef.current?.end();
        resolve({
          message: 'Files uploaded successfully',
          metadata: metadataArr,
        });
      });

      req.on('error', (err) => {
        fileStreamRef.current?.end();
        reject(err);
      });
    });
  }

  /**
   * Processes the buffer to extract multipart data
   */
  private processMultipartBuffer(
    bufferRef: { current: Buffer },
    boundary: string,
    metadataArr: Array<FileMetadata>,
    fileStreamRef: { current: WriteStream | null },
  ): void {
    let remainingBuffer = bufferRef.current;

    while (true) {
      // 1. Looking for boundary marker
      const boundaryIndex = remainingBuffer.indexOf(`--${boundary}`);
      if (boundaryIndex === -1) break;

      // 2. Finding where headers end (double CRLF)
      const partEndIndex = remainingBuffer.indexOf('\r\n\r\n', boundaryIndex);
      if (partEndIndex === -1) break;

      // 3. Extracting headers
      const headers = remainingBuffer.subarray(boundaryIndex, partEndIndex).toString();
      // 4. Parsing filename and content-type from headers
      const parsedHeaders = parseMultipartHeaders(headers);

      if (parsedHeaders.filename) {
        fileStreamRef.current?.end();

        const filePath = join(process.cwd(), parsedHeaders.filename);
        fileStreamRef.current = createWriteStream(filePath);
        const currentMetadata: FileMetadata = {
          filename: parsedHeaders.filename,
          fileType: parsedHeaders.contentType || 'unknown',
          uploadPath: filePath,
          uploadTimestamp: new Date().toISOString(),
        };

        metadataArr.push(currentMetadata);
      }

      const contentStartIndex = partEndIndex + 4;
      const nextBoundaryIndex = remainingBuffer.indexOf(`--${boundary}`, contentStartIndex);

      if (nextBoundaryIndex === -1) {
        remainingBuffer = remainingBuffer.subarray(contentStartIndex);
        break;
      }

      // 5. Extracting file content between boundaries
      const fileContent = remainingBuffer.subarray(contentStartIndex, nextBoundaryIndex - 2);

      // 6. Writing to file stream
      fileStreamRef.current?.write(fileContent);
      remainingBuffer = remainingBuffer.subarray(nextBoundaryIndex);
    }

    bufferRef.current = remainingBuffer;
  }
}
