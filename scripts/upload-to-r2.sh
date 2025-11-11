#!/bin/bash
set -e

# Configuration
BUCKET_NAME="semantic-docs-content"
CONTENT_DIR="./content"
MANIFEST_FILE="./manifest.json"

echo "🚀 Uploading content to R2 bucket: $BUCKET_NAME"
echo ""

# Check if manifest exists
if [ ! -f "$MANIFEST_FILE" ]; then
  echo "❌ manifest.json not found. Run 'pnpm generate:manifest' first."
  exit 1
fi

# Upload manifest.json
echo "📋 Uploading manifest.json..."
npx wrangler r2 object put "$BUCKET_NAME/manifest.json" --file="$MANIFEST_FILE"
echo "✓ Uploaded manifest.json"
echo ""

# Upload all markdown files
echo "📝 Uploading markdown files..."

# Find all .md files in content directory
find "$CONTENT_DIR" -type f -name "*.md" | while read -r file; do
  # Get relative path from content directory
  relative_path="${file#$CONTENT_DIR/}"

  echo "  Uploading: $relative_path"
  npx wrangler r2 object put "$BUCKET_NAME/$relative_path" --file="$file"
done

echo ""
echo "✅ Upload complete!"
echo ""
echo "Uploaded files:"
npx wrangler r2 object list "$BUCKET_NAME"
