FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm install && npm run build -- --output-path=dist

FROM httpd:2.4-alpine
COPY --from=builder /app/dist/browser /usr/local/apache2/htdocs
COPY httpd.conf /usr/local/apache2/conf/httpd.conf