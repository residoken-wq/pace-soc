FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=0 --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=0 --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=0 --chown=nextjs:nodejs /app/public ./public

RUN mkdir data && chown nextjs:nodejs data

USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
