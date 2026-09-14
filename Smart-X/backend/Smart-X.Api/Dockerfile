# Smart-X API image (multi-stage build).
# Build context is the Smart-X folder, e.g. from Smart-X/:
#   docker build -f backend/Smart-X.Api/Dockerfile -t smartx-api .
# See https://aka.ms/customizecontainer for how Visual Studio uses this file.

# Runtime base image: only the ASP.NET runtime, no SDK, so the final image stays small.
# This stage is also used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# Build stage: full .NET SDK
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
# Copy the project file first and restore, so NuGet packages are cached as a
# layer and only re-downloaded when the .csproj changes.
COPY ["backend/Smart-X.Api/Smart-X.Api.csproj", "backend/Smart-X.Api/"]
RUN dotnet restore "./backend/Smart-X.Api/Smart-X.Api.csproj"
COPY . .
WORKDIR "/src/backend/Smart-X.Api"
RUN dotnet build "./Smart-X.Api.csproj" -c $BUILD_CONFIGURATION -o /app/build

# Publish stage: produces the compiled output that gets copied into the final image
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./Smart-X.Api.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# Final stage: runtime image + published app
# (Default when running from VS in regular mode, not the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# The app runs as a non-root user, which cannot create folders in /app.
# Create the uploads folder (used by SensorMediaController) and give that user
# ownership so sensor log/photo uploads can be saved.
USER root
RUN mkdir -p /app/uploads && chown -R $APP_UID /app/uploads
USER $APP_UID

ENTRYPOINT ["dotnet", "Smart-X.Api.dll"]
