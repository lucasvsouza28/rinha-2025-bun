_build:
	docker build -t lucasvsouza28/rinha-bun --no-cache .

build:
	$(MAKE) _build

_release:
	docker push lucasvsouza28/rinha-bun:latest

release:
	$(MAKE) _release

_processors-up:
	docker compose -f ~/git/rinha-de-backend-2025/payment-processor/docker-compose.yml up -d --force-recreate --remove-orphans

processors-up:
	$(MAKE) _processors-up

_rinha-up-prd:
	docker compose -f docker-compose-prd.yml up --force-recreate --remove-orphans

rinha-up-prd:
	$(MAKE) _rinha-up-prd

_rinha-down-prd:
	docker compose -f docker-compose-prd.yml down -v

rinha-down-prd:
	$(MAKE) _rinha-down-prd

_rinha-dev:
	docker compose up --build --watch

rinha-dev:
	$(MAKE) _rinha-dev

_rinha-stats:
	docker stats $(docker ps | grep rinha-2025-bun | awk '{print $1}')

rinha-stats:
	$(MAKE) _rinha-stats
