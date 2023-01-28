FROM debian:latest

COPY ./ app/

RUN chmod +x app/install_docker.sh app/foundry.sh app/docker-entrypoint.sh

RUN ./app/install_docker.sh

EXPOSE 30000

WORKDIR /app

ENTRYPOINT ["bash", "foundry.sh", "--local"]