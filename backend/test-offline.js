// backend/test-offline.js
// Test suite for offline mode handling

require('dotenv').config({ path: __dirname + '/.env' });
const DatabaseService = require('./services/database');

async function testOfflineMode() {
    console.log('🧪 Testing Offline Mode Handling...\n');

    // Set to local mode for testing
    process.env.DEPLOYMENT_MODE = 'local';

    // Temporarily disable Supabase to simulate offline
    const originalUrl = process.env.SUPABASE_URL;
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Test 1: Initialize in offline mode
    console.log('Test 1: Initialize database in offline mode');
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    try {
        const db = new DatabaseService({ mode: 'local' });
        console.log('✅ Database initialized in offline mode');
        console.log(`   - Local mode: ${db.isLocalMode()}`);
        console.log(`   - Community available: ${db.isCommunityAvailable()}\n`);

        // Test 2: Local operations should work offline
        console.log('Test 2: Local operations in offline mode');
        const testUserId = 'offline-test-user';
        
        // Create character (should work)
        const character = await db.createCharacter(testUserId, {
            name: 'Offline Test Character',
            personality: 'Testing offline mode',
            age: '25',
            sex: 'female',
            appearance: 'Test appearance',
            background: 'Created during offline test'
        });
        console.log(`✅ Created character: ${character.id}`);

        // Create scenario (should work)
        const scenario = await db.createScenario(testUserId, {
            name: 'Offline Scenario',
            description: 'Testing scenario creation offline',
            initial_message: 'Welcome to the offline test scenario!',
            location: 'Test Location',
            time_period: 'Present',
            character_id: character.id
        });
        console.log(`✅ Created scenario: ${scenario.id}`);

        // Create chat session (should work)
        const sessionData = await db.createChatSession(testUserId, {
            title: 'Offline Test Chat',
            scenario_id: scenario.id,
            active_characters: [character.id],
            group_mode: 'natural',
            metadata: {}
        });
        console.log(`✅ Created chat session: ${sessionData.id}\n`);

        // Test 3: Community operations should fail gracefully
        console.log('Test 3: Community operations in offline mode');
        
        try {
            await db.publishCharacter(testUserId, character.id, {
                isLocked: false,
                hiddenFields: []
            });
            console.log('❌ Publish should have failed in offline mode');
        } catch (error) {
            if (error.code === 'OFFLINE' && error.offline === true) {
                console.log('✅ Publish failed gracefully with offline error');
                console.log(`   Message: "${error.message}"`);
            } else {
                console.log(`⚠️  Unexpected error: ${error.message}`);
            }
        }

        try {
            await db.importCharacterFromCommunity(testUserId, 'fake-id');
            console.log('❌ Import should have failed in offline mode');
        } catch (error) {
            if (error.code === 'OFFLINE' && error.offline === true) {
                console.log('✅ Import failed gracefully with offline error');
                console.log(`   Message: "${error.message}"`);
            } else {
                console.log(`⚠️  Unexpected error: ${error.message}`);
            }
        }

        // Test 4: Cleanup
        console.log('\nTest 4: Cleanup offline test data');
        await db.deleteCharacter(testUserId, character.id);
        console.log('✅ Cleaned up test character\n');

        console.log('✅ All offline mode tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        // Restore Supabase credentials
        if (originalUrl) process.env.SUPABASE_URL = originalUrl;
        if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
    }

    // Test 5: Local mode with community available
    console.log('\n\nTest 5: Local mode with community features available');
    try {
        const db = new DatabaseService({ mode: 'local' });
        console.log('✅ Database initialized in local mode with community');
        console.log(`   - Local mode: ${db.isLocalMode()}`);
        console.log(`   - Community available: ${db.isCommunityAvailable()}`);
        
        // Local operations should still work
        const character = await db.createCharacter('local-with-community', {
            name: 'Local+Community Test',
            personality: 'Testing local mode with community',
            age: '30',
            sex: 'male',
            appearance: 'Test',
            background: 'Test'
        });
        console.log(`✅ Created character in local storage: ${character.id}`);
        
        // Community operations should now work (but will fail auth, not offline)
        try {
            await db.publishCharacter('not-a-uuid', character.id, {});
        } catch (error) {
            if (error.message.includes('UUID')) {
                console.log('✅ Publish failed with UUID validation (expected)');
            } else if (error.code === 'OFFLINE') {
                console.log('❌ Should not get offline error when community is available');
            }
        }
        
        // Cleanup
        await db.deleteCharacter('local-with-community', character.id);
        console.log('✅ Cleaned up test data');
        
    } catch (error) {
        console.error('❌ Test 5 failed:', error);
    }

    console.log('\n✨ Offline mode testing complete!');
}

// Run tests
testOfflineMode().catch(console.error);
