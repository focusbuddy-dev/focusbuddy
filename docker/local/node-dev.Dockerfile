FROM node:24-bookworm-slim

RUN corepack enable pnpm \
	&& mkdir -p /workspace \
	&& chown node:node /workspace

WORKDIR /workspace

USER node

CMD ["node", "--version"]