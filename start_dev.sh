#!/bin/bash
docker-compose -f docker-compose-develop.yml up -d && docker-compose -f docker-compose-develop.yml logs -f --tail=50 nodejs
