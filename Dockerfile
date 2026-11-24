FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
# La plantilla de CI ejecuta `npm run build` (configuracion production de angular.json).
COPY dist/taller-ia-siaf-rp/browser/ /usr/share/nginx/html/

EXPOSE 8080
