import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import os from 'node:os';
import fs from 'node:fs/promises';
import { open } from 'node:fs/promises';
import { requireSession } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';

export const pdfRouter = Router();

// Disk storage instead of memory to bound RAM under concurrent uploads. Combined with
// the per-IP rate limit on /api/pdf, parallel uploads can't exhaust the heap.
const upload = multer({
    storage: multer.diskStorage({ destination: os.tmpdir() }),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') return cb(null, true);
        cb(new AppError('errors.pdf.unsupportedMediaType', 415, 'pdf only'));
    },
});

const PDF_MAGIC = Buffer.from('%PDF-');

async function assertPdfMagicBytes(filePath: string): Promise<void> {
    const fh = await open(filePath, 'r');
    try {
        const buf = Buffer.alloc(PDF_MAGIC.length);
        await fh.read(buf, 0, PDF_MAGIC.length, 0);
        if (!buf.equals(PDF_MAGIC)) {
            throw new AppError('errors.pdf.unsupportedMediaType', 415, 'not a pdf (magic bytes)');
        }
    } finally {
        await fh.close();
    }
}

const PdfPage = z.object({ index: z.number(), paragraphs: z.array(z.string()) }).openapi('PdfPage');
const PdfExtractResponse = z.object({ pages: z.array(PdfPage) }).openapi('PdfExtractResponse');

registry.registerPath({
    method: 'post', path: '/api/pdf/extract',
    operationId: 'pdfExtract',
    request: { body: { content: { 'multipart/form-data': { schema: z.object({ file: z.string() }) } } } },
    responses: { 200: { description: 'extracted', content: { 'application/json': { schema: PdfExtractResponse } } } },
});

pdfRouter.post('/api/pdf/extract', requireSession, upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError('errors.pdf.noFile', 400, 'file required');
    const tmpPath = req.file.path;
    try {
        await assertPdfMagicBytes(tmpPath);
        const buf = await fs.readFile(tmpPath);
        // Lazy import to avoid pdf-parse self-test at module load
        const pdfParse = (await import('pdf-parse')).default;
        const result = await pdfParse(buf);
        const fullText: string = result.text || '';
        const pages = fullText.split(/\f/).map((pageText, index) => ({
            index,
            paragraphs: pageText.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0),
        }));
        res.json({ pages });
    } finally {
        await fs.unlink(tmpPath).catch(() => undefined);
    }
}));
