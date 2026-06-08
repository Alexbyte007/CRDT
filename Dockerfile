FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends sqlite3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3001
ENV DATABASE_PATH=/app/data/crdt.sqlite
ENV DOC_ID=doc-sample

EXPOSE 3001

CMD ["npm", "start"]
