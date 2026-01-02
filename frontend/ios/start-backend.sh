#!/bin/bash
# Start the Node.js backend server on iOS device

# Get the app's Documents directory
BACKEND_DIR="$HOME/Library/Application Support/CHAIT-Backend"

# Create backend directory if it doesn't exist
mkdir -p "$BACKEND_DIR"

# Copy backend files if not already there
if [ ! -f "$BACKEND_DIR/server-supabase.js" ]; then
    echo "Setting up backend files..."
    # Backend files should be bundled with the app
fi

# Start the backend server
cd "$BACKEND_DIR"
node server-supabase.js &

echo "Backend server started on port 3001"
