set dotenv-load := false

# bring up the dev stack: db, backend, frontend, hot-reload everything
dev:
    docker compose -f docker-compose.dev.yml up --build

dev-down:
    docker compose -f docker-compose.dev.yml down

# regenerate the OpenAPI client from a running backend
gen-api:
    cd frontend && npm run gen-api

# run the deploy stack
deploy:
    docker compose -f docker-compose.deploy.yml up -d --build

deploy-down:
    docker compose -f docker-compose.deploy.yml down

# DB helpers
db-migrate:
    docker compose -f docker-compose.dev.yml exec backend npm run db:migrate

db-seed:
    docker compose -f docker-compose.dev.yml exec backend npm run db:seed

db-reset:
    docker compose -f docker-compose.dev.yml exec backend npm run db:reset
