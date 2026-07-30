# Build stage
FROM amazoncorretto:26-alpine-jdk AS builder

WORKDIR /app

COPY gradlew .
COPY gradle gradle
COPY settings.gradle .
COPY build.gradle .

RUN chmod +x gradlew
RUN ./gradlew dependencies --no-daemon || true

COPY src src

RUN ./gradlew bootJar --no-daemon

# Runtime stage
FROM amazoncorretto:26-alpine

WORKDIR /app

COPY --from=builder /app/build/libs/*.jar battlereadyshelf.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/battlereadyshelf.jar"]