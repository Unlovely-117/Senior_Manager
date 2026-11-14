# syntax=docker/dockerfile:1

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html main.tsx tsconfig.json vite.config.ts tailwind.config.cjs postcss.config.cjs global.d.ts vite-env.d.ts ./
COPY application ./application
COPY domain ./domain
COPY infrastructure ./infrastructure
COPY presentation ./presentation

ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

