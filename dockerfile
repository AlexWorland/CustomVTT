FROM debian:latest

COPY ./ app/

RUN cd app; chmod +x install.sh start.sh docker-entrypoint.sh

RUN ./app/install.sh

EXPOSE 30000

# ENTRYPOINT ["app/docker-entrypoint.sh"]