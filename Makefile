PERM0=--allow-env --allow-net --allow-run
PERM1=--allow-write="$(SORTITION_DIR)" --allow-read="$(SORTITION_DIR),$(PWD)"
PERM2=--unstable
PERM=$(PERM0) $(PERM1) $(PERM2)
PERM_OSX=$(PERM0) --allow-write="$(SORTITION_DIR),/usr/local/etc/nginx/servers" --allow-read="$(SORTITION_DIR),$(PWD)" $(PERM2)
PERM_LINUX=$(PERM0) --allow-write="$(SORTITION_DIR),/etc/nginx/sites-enabled" --allow-read="$(SORTITION_DIR),$(PWD)" $(PERM2)
PERM_PROD=$(PERM0) --allow-write="$(SORTITION_DIR),/etc/systemd/system,/etc/nginx/sites-enabled" --allow-read="$(SORTITION_DIR),$(PWD)" $(PERM2)
ARGS0=--dir="$(SORTITION_DIR)" --port="$(SORTITION_PORT)"
ID_ARGS=--idLength="$(ID_LENGTH)" --idAlphabet="$(ID_ALPHABET)"
SERVE_ARGS=$(ARGS0) $(ID_ARGS)
NGINX_CONF?="sortition_nginx"
SERVICE_FILE?="sortition_server"
NAME_ARGS=--conf=$(NGINX_CONF) --service=$(SERVICE_FILE)
CONFIG_ARGS=--configure $(ARGS0) --host="$(NGINX_HOST)" --nginx="$(NGINX_PORT)"
TEST_ARGS=--test $(CONFIG_ARGS)
OS := $(shell uname)
is_darwin :=$(filter Darwin,$(OS))
CONFIG_DEV_CMD_LINUX=sudo $(HOME)/.deno/bin/deno run $(PERM_LINUX) src/sortition.ts $(CONFIG_ARGS)
CONFIG_DEV_CMD_OSX=$(HOME)/.deno/bin/deno run $(PERM_OSX) src/sortition.ts $(CONFIG_ARGS)
PROD_ARGS=$(CONFIG_ARGS) $(NAME_ARGS) $(ID_ARGS) --production


run:
	test $(SORTITION_PORT)
	test $(SORTITION_DIR)
	$(HOME)/.deno/bin/deno run $(PERM) src/sortition.ts $(SERVE_ARGS)

help:
	$(HOME)/.deno/bin/deno run $(PERM2) src/sortition.ts --help

tester:
	test $(NGINX_HOST)
	test $(NGINX_PORT)
	test $(SORTITION_PORT)
	test $(SORTITION_DIR)
	$(HOME)/.deno/bin/deno run $(PERM) src/sortition.ts $(TEST_ARGS)

config-dev:
	test $(NGINX_HOST)
	test $(NGINX_PORT)
	test $(SORTITION_PORT)
	test $(SORTITION_DIR)
	$(if $(is_darwin), $(CONFIG_DEV_CMD_OSX), $(CONFIG_DEV_CMD_LINUX))

config-prod:
	test $(NGINX_HOST)
	test $(NGINX_PORT)
	test $(SORTITION_PORT)
	test $(SORTITION_DIR)
	sudo $(HOME)/.deno/bin/deno run $(PERM_PROD) src/sortition.ts $(PROD_ARGS)