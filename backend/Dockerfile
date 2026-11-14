# syntax=docker/dockerfile:1

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests compile dependency:copy-dependencies -DincludeScope=runtime

FROM eclipse-temurin:17-jre-jammy AS runtime
WORKDIR /app

RUN groupadd --system appgroup && useradd --system --gid appgroup --no-create-home appuser

COPY --from=build /workspace/target/classes /app/classes
COPY --from=build /workspace/target/dependency /app/dependency
COPY migrations /app/migrations
COPY config /app/config

RUN chown -R appuser:appgroup /app
USER appuser

ENV SENIOR_MANAGE_BIND_ADDRESS=0.0.0.0 \
    PORT=8080 \
    SENIOR_MANAGE_AUTO_BOOTSTRAP=true \
    SENIOR_MANAGE_PERMISSION_MATRIX_SHA256=6EDB8C419013B86D62BABAC0A9D1F9668918158AA332AA7BF5B46B9EE60FA969

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "if [ \"${SENIOR_MANAGE_AUTO_BOOTSTRAP:-true}\" = \"true\" ]; then java -Dsenior.manage.migrationsDirectory=/app/migrations -Dsenior.manage.permissionMatrixPath=/app/config/permission-matrix-approved.csv -cp '/app/classes:/app/dependency/*' infrastructure.bootstrap.ContainerBootstrap; fi && exec java -Dsenior.manage.migrationsDirectory=/app/migrations -cp '/app/classes:/app/dependency/*' presentation.SeniorManageApiServer"]

