UUID = multi-display-adjustment@cecilio.xyz

SOURCE_DIR = $(CURDIR)
INSTALL_DIR = $(HOME)/.local/share/gnome-shell/extensions/$(UUID)

JS_SOURCES = $(wildcard *.js)
SCHEMAS_DIR = schemas
SCHEMAS_COMPILED = $(SCHEMAS_DIR)/gschemas.compiled
PACKAGE = dist/$(UUID).shell-extension.zip

# tree-sitter 0.26 makes shexli 0.2.1 crash with a segmentation fault
SHEXLI ?= uvx --with 'tree-sitter<0.26' shexli

.PHONY: help pack install link unlink uninstall enable disable status check lint nested logs schemas

help:
	@echo "Getting the extension into the shell (pick one)"
	@echo "  make install    build the package and install a copy of it"
	@echo "  make link       symlink this working tree, so edits need no rebuild"
	@echo ""
	@echo "Either way, log out and back in for the shell to pick it up."
	@echo ""
	@echo "  make enable     enable the extension"
	@echo "  make disable    disable it"
	@echo "  make status     show what is installed and whether it runs"
	@echo "  make uninstall  remove the installed copy or the symlink"
	@echo ""
	@echo "  make pack       only build dist/$(UUID).shell-extension.zip"
	@echo "  make check      look for syntax errors in the sources"
	@echo "  make lint       run the extensions.gnome.org analyzer on the package"
	@echo "  make nested     start a throwaway shell to catch startup errors"
	@echo "  make schemas    compile GSettings schemas for a symlink install"
	@echo "  make logs       follow the shell log"

pack:
	./dist.sh

# dist.sh refuses to install over the symlink, which would delete this tree.
install:
	./dist.sh --install

schemas: $(SCHEMAS_COMPILED)

$(SCHEMAS_COMPILED): $(wildcard $(SCHEMAS_DIR)/*.gschema.xml)
	glib-compile-schemas --strict $(SCHEMAS_DIR)

# getSettings() looks for schemas/gschemas.compiled in the extension directory,
# which for a symlink is this working tree.
link: schemas
	@if [ -e "$(INSTALL_DIR)" ] && [ ! -L "$(INSTALL_DIR)" ]; then \
	    echo "$(INSTALL_DIR) is an installed copy. Run 'make uninstall' first." >&2; \
	    exit 1; \
	fi
	@mkdir -p "$(dir $(INSTALL_DIR))"
	ln -sfn "$(SOURCE_DIR)" "$(INSTALL_DIR)"
	@echo "Linked $(INSTALL_DIR) -> $(SOURCE_DIR)"
	@echo "Log out and back in, then: make enable"

unlink:
	@if [ -L "$(INSTALL_DIR)" ]; then \
	    rm -f "$(INSTALL_DIR)"; \
	    echo "Removed the symlink"; \
	else \
	    echo "$(INSTALL_DIR) is not a symlink, nothing removed"; \
	fi

# Deletes a directory, so it checks what it is dealing with first.
uninstall:
	@if [ -L "$(INSTALL_DIR)" ]; then \
	    rm -f "$(INSTALL_DIR)"; \
	    echo "Removed the symlink, the working tree is untouched"; \
	elif [ -d "$(INSTALL_DIR)" ]; then \
	    rm -rf "$(INSTALL_DIR)"; \
	    echo "Removed the installed copy"; \
	else \
	    echo "Nothing installed at $(INSTALL_DIR)"; \
	fi

enable:
	gnome-extensions enable $(UUID)

disable:
	gnome-extensions disable $(UUID)

status:
	@if [ -L "$(INSTALL_DIR)" ]; then \
	    echo "installed: symlink to $$(readlink -f '$(INSTALL_DIR)')"; \
	elif [ -d "$(INSTALL_DIR)" ]; then \
	    echo "installed: copy in $(INSTALL_DIR)"; \
	else \
	    echo "installed: no"; \
	fi
	@echo "enabled in settings: $$(gsettings get org.gnome.shell enabled-extensions | grep -q '$(UUID)' && echo yes || echo no)"
	@echo "known to the running shell:"
	@gnome-extensions info $(UUID) 2>&1 | sed 's/^/  /'

# Modules are only parsed, since the shell imports they pull in do not resolve
# outside of a shell process. That is enough to catch a syntax error.
check:
	@command -v gjs >/dev/null || { echo "gjs not found, nothing was checked" >&2; exit 1; }
	@status=0; \
	for file in $(JS_SOURCES); do \
	    errors="$$(gjs -m $$file 2>&1 | grep -F 'SyntaxError' || true)"; \
	    if [ -n "$$errors" ]; then echo "$$file: $$errors"; status=1; fi; \
	done; \
	if [ $$status -eq 0 ]; then echo "No syntax errors in $(words $(JS_SOURCES)) files"; fi; \
	exit $$status

# Shexli is what extensions.gnome.org runs on an uploaded package. It exits
# with 0 even when it reports findings, so its summary line is checked.
lint: pack
	@command -v $(firstword $(SHEXLI)) >/dev/null || { echo "$(firstword $(SHEXLI)) not found, see dev.md" >&2; exit 1; }
	@output="$$($(SHEXLI) $(PACKAGE))" || { echo "$$output"; exit 1; }; \
	echo "$$output"; \
	echo "$$output" | grep -q '^shexli: clean'

# The displays of this session are virtual and have no DDC/CI, so no sliders
# show up in it. It is for seeing whether the extension starts without errors.
# The compiled schema is required: getSettings() throws if it is missing.
nested: schemas
	dbus-run-session -- gnome-shell --headless --virtual-monitor 1920x1080 --virtual-monitor 1280x1024

logs:
	journalctl --user -f -o cat /usr/bin/gnome-shell
