FROM nginx:1.27-alpine

# Proxy corporate — transmis aux étapes RUN
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ENV HTTP_PROXY=$HTTP_PROXY \
    HTTPS_PROXY=$HTTPS_PROXY \
    NO_PROXY=$NO_PROXY

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

EXPOSE 80
