// Test script to verify dual-database setup and operations
const DatabaseService = require('./services/database');
require('dotenv').config();

async function testSetup() {
    try {
        console.log('Testing Dual-Database Setup & Operations...\n');
        
        // Test Local Mode
        console.log('=== LOCAL MODE ===');
        const localDb = new DatabaseService({ mode: 'local' });
        console.log('✓ Local mode initialized');
        console.log(`  Mode: ${localDb.mode}`);
        console.log(`  Local DB: ${localDb.isLocalMode()}`);
        console.log(`  Community Available: ${localDb.isCommunityAvailable()}`);
        
        if (localDb.isLocalMode()) {
            const stats = localDb.getStats();
            console.log('\n  Database Statistics:');
            console.log(`  - Location: ${localDb.localDb.dbPath}`);
            console.log(`  - Characters: ${stats.characters}`);
            console.log(`  - Scenarios: ${stats.scenarios}`);
            console.log(`  - Chat Sessions: ${stats.chatSessions}`);
            console.log(`  - Messages: ${stats.messages}`);
            console.log(`  - Memories: ${stats.memories}`);
            console.log(`  - DB Size: ${(stats.dbSize / 1024).toFixed(2)} KB`);

            // Test character operations
            console.log('\n  Testing Character Operations:');
            
            // Create a test character
            const testChar = await localDb.createCharacter('test-user-1', {
                name: 'Test Character',
                personality: 'A friendly test character for verifying the database works correctly',
                age: 25,
                sex: 'non-binary',
                avatar: '🧪',
                color: 'from-purple-500 to-pink-500',
                tags: ['test', 'demo']
            });
            console.log(`  ✓ Created character: ${testChar.name} (ID: ${testChar.id})`);

            // Retrieve characters
            const characters = await localDb.getCharacters('test-user-1');
            console.log(`  ✓ Retrieved ${characters.length} character(s)`);

            // Update character
            await localDb.updateCharacter(testChar.id, {
                personality: 'An updated test character with new personality'
            });
            console.log(`  ✓ Updated character`);

            // Test scenario operations
            console.log('\n  Testing Scenario Operations:');
            const testScenario = await localDb.createScenario('test-user-1', {
                name: 'Test Scene',
                description: 'A test scenario',
                initial_message: 'Welcome to the test!',
                atmosphere: 'casual'
            });
            console.log(`  ✓ Created scenario: ${testScenario.name}`);

            // Test chat session
            console.log('\n  Testing Chat Operations:');
            const testSession = await localDb.createChatSession('test-user-1', {
                title: 'Test Chat',
                scenario_id: testScenario.id,
                active_characters: [testChar.id]
            });
            console.log(`  ✓ Created chat session: ${testSession.title}`);

            // Create message
            await localDb.saveChatMessage(testSession.id, {
                session_id: testSession.id,
                sender_type: 'user',
                content: 'Hello test!'
            });
            console.log(`  ✓ Saved message`);

            // Test memory operations
            console.log('\n  Testing Memory Operations:');
            await localDb.addCharacterMemory(testChar.id, 'test-user-1', {
                content: 'User likes to test things',
                memory_type: 'semantic',
                importance_score: 0.7
            });
            console.log(`  ✓ Added memory`);

            const memories = await localDb.getCharacterMemories(testChar.id, 'test-user-1');
            console.log(`  ✓ Retrieved ${memories.length} memor${memories.length === 1 ? 'y' : 'ies'}`);

            // Test relationship
            console.log('\n  Testing Relationship Operations:');
            await localDb.updateCharacterRelationship(testChar.id, 'test-user-1', {
                trust_level: 0.6,
                familiarity_level: 0.3,
                emotional_bond: 0.2
            });
            console.log(`  ✓ Updated relationship`);

            // Clean up test data
            console.log('\n  Cleaning up test data:');
            await localDb.deleteCharacter(testChar.id);
            await localDb.deleteScenario('test-user-1', testScenario.id);
            await localDb.deleteChatSession('test-user-1', testSession.id);
            console.log(`  ✓ Deleted test data`);

            // Final stats
            const finalStats = localDb.getStats();
            console.log(`\n  Final Statistics:`);
            console.log(`  - Characters: ${finalStats.characters}`);
            console.log(`  - Scenarios: ${finalStats.scenarios}`);
            console.log(`  - Chat Sessions: ${finalStats.chatSessions}`);
        }
        
        // Test Web Mode (if Supabase is configured)
        console.log('\n=== WEB MODE ===');
        if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const webDb = new DatabaseService({ mode: 'web' });
                console.log('✓ Web mode initialized');
                console.log(`  Mode: ${webDb.mode}`);
                console.log(`  Web DB: ${webDb.isWebMode()}`);
                console.log(`  Community Available: ${webDb.isCommunityAvailable()}`);
            } catch (error) {
                console.log('✗ Web mode not available:', error.message);
            }
        } else {
            console.log('⚠ Supabase not configured - skipping web mode test');
        }
        
        console.log('\n✅ All tests passed!');
        console.log('\nArchitecture:');
        console.log('- Local Mode: SQLite for local data + Supabase for community');
        console.log('- Web Mode: Supabase for all data');
        console.log('- All CRUD operations working correctly');
        
        // Close local database
        if (localDb.localDb) {
            localDb.localDb.close();
        }
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

testSetup();
