# ---- base image with Java 21 (MC 1.21 needs ≥17) ----
FROM eclipse-temurin:21-jre-jammy

ENV PAPER_VERSION=1.21 \
    MEMORY="4G"

# Download PaperMC jar
RUN apt-get update && apt-get install -y jq && \
    BUILD=$(curl -s "https://api.papermc.io/v2/projects/paper/versions/${PAPER_VERSION}" | jq -r '.builds[-1]') && \
    curl -L -o /papermc.jar "https://api.papermc.io/v2/projects/paper/versions/${PAPER_VERSION}/builds/${BUILD}/downloads/paper-${PAPER_VERSION}-${BUILD}.jar"

# Create volume for world & config
VOLUME ["/data"]
WORKDIR /data

# Copy default config & entrypoint
COPY server.properties eula.txt /data/
COPY plugins/ /data/plugins/
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 25565
ENTRYPOINT ["/entrypoint.sh"]
