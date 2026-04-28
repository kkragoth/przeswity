import fs from 'node:fs';
import { buildOpenApi } from './registry.js';

fs.writeFileSync('openapi.json', JSON.stringify(buildOpenApi(), null, 2));
