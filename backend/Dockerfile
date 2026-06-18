# Build — Maven + JDK 21. Camada de dependências separada do código pra
# aproveitar cache de layer em rebuilds (pom muda raramente, src muda sempre).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
# New Relic APM Java agent (pinado pra build reproduzível). Baixado cedo pra
# falhar rápido se a URL mudar e pra cachear separado do build do código.
ARG NEWRELIC_AGENT_VERSION=9.3.0
RUN curl -sSfL -o /newrelic.jar \
  "https://repo1.maven.org/maven2/com/newrelic/agent/java/newrelic-agent/${NEWRELIC_AGENT_VERSION}/newrelic-agent-${NEWRELIC_AGENT_VERSION}.jar"
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# Runtime — JRE only. Cloud Run injeta PORT (application.yml lê ${PORT:8080}).
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /newrelic.jar /app/newrelic/newrelic.jar
COPY --from=build /app/target/*.jar app.jar
# Agent desligado por default na imagem; prod (Cloud Run) liga via NEW_RELIC_AGENT_ENABLED=true.
# Sem license key (dev/local) o agent fica inerte mesmo se ligado.
ENV NEW_RELIC_AGENT_ENABLED=false
# Heap proporcional ao limite de memória do container (Cloud Run define o limite).
# -javaagent sempre presente; a ativação real é controlada pela env acima + license key.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0 -javaagent:/app/newrelic/newrelic.jar"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
