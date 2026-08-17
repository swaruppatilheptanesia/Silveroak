import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

const docsDir = path.resolve(__dirname, '..');
const isCompiledBuild = path.basename(docsDir) === 'dist';

// Use source files in dev and compiled files in the build/deploy bundle.
// This keeps Swagger populated whether the server runs from `src/` or `dist/`.
const apis = isCompiledBuild
  ? [path.join(docsDir, 'modules/**/*.routes.js'), path.join(docsDir, 'modules/**/*.swagger.js')]
  : [path.join(docsDir, 'modules/**/*.routes.ts'), path.join(docsDir, 'modules/**/*.swagger.ts')];

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Silver Oak T&P Portal API',
      version: '1.0.0',
      description: 'Training & Placement Portal Backend API for Silver Oak University',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis,
};

export const swaggerSpec = swaggerJsdoc(options);
