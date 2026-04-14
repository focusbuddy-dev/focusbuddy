import { setupServer } from 'msw/node';

import { handlers } from './handlers';

/**
 * Role: Creates the shared MSW server used by Jest web tests.
 * Boundary: Testing boundary only. Browser and production runtime code must not import this module.
 * Ref: #179
 */
export const server = setupServer(...handlers);
