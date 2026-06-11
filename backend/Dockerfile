# Build — Maven + JDK 21. Camada de dependências separada do código pra
# aproveitar cache de layer em rebuilds (pom muda raramente, src muda sempre).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# Runtime — JRE only. Cloud Run injeta PORT (application.yml lê ${PORT:8080}).
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Heap proporcional ao limite de memória do container (Cloud Run define o limite).
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75.0"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
