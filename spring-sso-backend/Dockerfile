FROM gradle:8.7-jdk17 AS builder

WORKDIR /app
COPY . .

# Si tienes `gradlew`, usa eso (más portable):
RUN ./gradlew build -x test

# Si no tienes wrapper (`gradlew`), puedes usar:
# RUN gradle build -x test

FROM eclipse-temurin:17-jdk
WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 3001
CMD ["java", "-jar", "app.jar"]
