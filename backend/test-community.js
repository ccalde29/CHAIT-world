// Test community operations
const DatabaseService = require('./services/database');
require('dotenv').config();

async function testCommunity() {
    try {
        console.log('Testing Community Operations...\n');
        
        const localDb = new DatabaseService({ mode: 'local' });
        
        console.log('=== CHARACTER LIFECYCLE TEST ===\n');
        
        // 1. Create a local character
        console.log('1. Creating local character...');
        const char = await localDb.createCharacter('test-user', {
            name: 'Community Test Char',
            personality: 'A test character for verifying publish/import functionality in the dual-database system.',
            age: 21,
            sex: 'female',
            avatar: '🧪',
            tags: ['test', 'community']
        });
        console.log(`   ✓ Created: ${char.name} (ID: ${char.id})`);
        
        // 2. Publish to community
        if (localDb.isCommunityAvailable()) {
            console.log('\n2. Publishing to community...');
            try {
                const published = await localDb.publishCharacter('test-user', char.id, {
                    isLocked: false,
                    hiddenFields: []
                });
                console.log(`   ✓ Published to community (Community ID: ${published.id})`);
                
                // 3. Simulate import by another user
                console.log('\n3. Importing as different user...');
                const imported = await localDb.importCharacterFromCommunity('test-user-2', published.id);
                console.log(`   ✓ Imported: ${imported.name} (New ID: ${imported.id})`);
                
                // 4. Clean up
                console.log('\n4. Cleaning up...');
                await localDb.deleteCharacter(char.id);
                await localDb.deleteCharacter(imported.id);
                
                // Clean up community entry
                await localDb.supabase
                    .from('community_characters')
                    .delete()
                    .eq('id', published.id);
                
                console.log('   ✓ Cleanup complete');
                
            } catch (error) {
                console.error('   ✗ Community operations failed:', error.message);
                console.log('   (This is expected if Supabase is not fully configured)');
                
                // Clean up local character
                await localDb.deleteCharacter(char.id);
            }
        } else {
            console.log('\n2. Skipping community operations (offline mode)');
            await localDb.deleteCharacter(char.id);
        }
        
        console.log('\n✅ Community operations test complete!');
        
        if (localDb.localDb) {
            localDb.localDb.close();
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

testCommunity();
