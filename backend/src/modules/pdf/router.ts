import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireSession } from '../../auth/session.js';
import { asyncHandler, AppError } from '../../lib/errors.js';
import { registry } from '../../openapi/registry.js';

export const pdfRouter = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') return cb(null, true);
        cb(new AppError('errors.pdf.unsupportedMediaType', 415, 'pdf only'));
    },
});

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
    // Lazy import to avoid pdf-parse self-test running at module load time
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(req.file.buffer);
    // Naive splitting: full text split by form-feed for pages, double newline for paragraphs.
    const fullText: string = result.text || '';
    const pages = fullText.split(/\f/).map((pageText, index) => ({
        index,
        paragraphs: pageText.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 0),
    }));
    res.json({ pages });
}));
