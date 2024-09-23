# Variables
EXTENSION_NAME := yahoo_pick_pool_tool
ZIP_FILE := $(EXTENSION_NAME).zip
SOURCE_DIR := extension
SUBMIT_URL := https://addons.mozilla.org/en-US/developers/addon/yahoo-pick-pool-tool/versions/submit/

# Default target
all: build

# Build the extension
build:
	@echo "Building $(EXTENSION_NAME) extension..."
	@if [ -f $(ZIP_FILE) ]; then rm $(ZIP_FILE); fi
	@cd $(SOURCE_DIR) && zip -r ../$(ZIP_FILE) *
	@echo "Extension built: $(ZIP_FILE)"
	@echo "Opening submission page..."
	@open "$(SUBMIT_URL)"

# Clean up
clean:
	@echo "Cleaning up..."
	@rm -f $(ZIP_FILE)
	@echo "Cleanup complete"

# Help target
help:
	@echo "Available targets:"
	@echo "  build  - Build the extension (default)"
	@echo "  clean  - Remove the built extension"
	@echo "  help   - Show this help message"

.PHONY: all build clean help
