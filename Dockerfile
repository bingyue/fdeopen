ARG NODE_IMAGE=node:22-bookworm-slim
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
FROM deps AS builder
COPY . .
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN npm run build
FROM deps AS tools
COPY . .
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs \
    && mkdir -p /app/.data/uploads && chown -R nextjs:nodejs /app/.data
USER nextjs
CMD ["npm", "run", "db:migrate"]
FROM ${NODE_IMAGE} AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3210 HOSTNAME=0.0.0.0 MEDIA_UPLOAD_DIR=/app/.data/uploads
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/content ./content
COPY --from=builder --chown=nextjs:nodejs /app/supabase ./supabase
RUN mkdir -p /app/.data/uploads && chown -R nextjs:nodejs /app/.data
USER nextjs
EXPOSE 3210
CMD ["node", "server.js"]
