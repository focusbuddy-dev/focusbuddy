FROM node:24-bookworm-slim

WORKDIR /workspace

RUN corepack enable pnpm

CMD ["node", "--version"]