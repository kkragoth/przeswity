set dotenv-load := false

# bring up the dev stack (db, shared, backend). Frontend runs natively via `npm -w frontend run dev`.
dev:
    docker compose -f docker-compose.dev.yml up --build db shared backend

dev-down:
    docker compose -f docker-compose.dev.yml down

# wipe the shared node_modules volume so the installer reinstalls it (fixes platform/optional-dep mismatches)
fix-backend-node-modules:
    docker compose -f docker-compose.dev.yml down
    docker volume rm przeswity_node_modules

# bring up just the database
db-up:
    docker compose -f docker-compose.dev.yml up -d db

# regenerate the OpenAPI client from a running backend
gen-api:
    cd frontend && PUBLIC_API_URL=http://localhost:8080 npm run gen-api

# run the deploy stack
deploy:
    docker compose -f docker-compose.deploy.yml up -d --build

deploy-down:
    docker compose -f docker-compose.deploy.yml down

# DB helpers (run against the dev compose backend container)
db-migrate:
    docker compose -f docker-compose.dev.yml exec backend npm -w backend run db:migrate

db-seed:
    docker compose -f docker-compose.dev.yml exec backend npm -w backend run db:seed

db-reset:
    docker compose -f docker-compose.dev.yml exec backend npm -w backend run db:reset
