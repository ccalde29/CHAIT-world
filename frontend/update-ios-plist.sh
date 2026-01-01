#!/bin/bash
# Update iOS Info.plist to add custom URL scheme for OAuth

PLIST_PATH="ios/App/App/Info.plist"

if [ ! -f "$PLIST_PATH" ]; then
    echo "Error: Info.plist not found at $PLIST_PATH"
    echo "Run 'npm run build && npx cap sync ios' first"
    exit 1
fi

# Add URL scheme if not already present
if ! grep -q "chaitworld" "$PLIST_PATH"; then
    echo "Adding chaitworld URL scheme to Info.plist..."
    
    # Use PlistBuddy to add URL scheme
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes array" "$PLIST_PATH" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0 dict" "$PLIST_PATH" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLName string 'com.chaitworld.app'" "$PLIST_PATH" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes array" "$PLIST_PATH" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string 'chaitworld'" "$PLIST_PATH" 2>/dev/null || true
    
    echo "✓ URL scheme added successfully"
else
    echo "✓ URL scheme already exists"
fi

echo ""
echo "Next steps:"
echo "1. Build: npm run build"
echo "2. Sync: npx cap sync ios"  
echo "3. Open Xcode: npx cap open ios"
echo "4. In Supabase dashboard, add redirect URL: chaitworld://auth/callback"
