FROM debian:latest

COPY ./ app/

RUN chmod +x app/install.sh app/start.sh app/docker-entrypoint.sh

RUN ./app/install.sh

EXPOSE 30000

WORKDIR /app

ENTRYPOINT ["bash", "start.sh"]