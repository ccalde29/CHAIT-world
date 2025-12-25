/**
 * Data Migration Script: SQLite to Supabase
 * Migrates admin and token data from local SQLite to Supabase
 * 
 * This addresses the critical security vulnerability where admin status
 * and sensitive token data were stored in a local database that users
 * could modify.
 */

const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// SQLite database path
const dbPath = path.join(__dirname, '../../data/local.db');
const db = new sqlite3.Database(dbPath);

// Promisify database queries
const dbAll = (query, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

/**
 * Migrate admin users
 */
async function migrateAdminUsers() {
    console.log('\n📋 Migrating admin users...');
    
    try {
        // Get users with is_admin = 1
        const adminUsers = await dbAll(
            'SELECT user_id FROM user_settings_local WHERE is_admin = 1'
        );
        
        if (adminUsers.length === 0) {
            console.log('⚠️  No admin users found in local database');
            return;
        }
        
        console.log(`Found ${adminUsers.length} admin user(s)`);
        
        // Insert into Supabase
        for (const admin of adminUsers) {
            const { data, error } = await supabase
                .from('admin_users')
                .upsert({
                    user_id: admin.user_id,
                    granted_by: admin.user_id, // Self-granted for initial migration
                    notes: 'Migrated from local SQLite database'
                });
            
            if (error) {
                console.error(`❌ Error migrating admin ${admin.user_id}:`, error.message);
            } else {
                console.log(`✅ Migrated admin: ${admin.user_id}`);
            }
        }
    } catch (error) {
        console.error('❌ Error migrating admin users:', error);
        throw error;
    }
}

/**
 * Migrate admin API keys
 */
async function migrateAdminApiKeys() {
    console.log('\n🔑 Migrating admin API keys...');
    
    try {
        const apiKeys = await dbAll('SELECT * FROM admin_api_keys');
        
        if (apiKeys.length === 0) {
            console.log('⚠️  No admin API keys found in local database');
            return;
        }
        
        console.log(`Found ${apiKeys.length} admin API key record(s)`);
        
        // Note: Keys are already encrypted in SQLite, we'll migrate them as-is
        for (const keys of apiKeys) {
            const { data, error } = await supabase
                .from('admin_api_keys')
                .upsert({
                    user_id: keys.user_id,
                    openai_key: keys.openai_key,
                    anthropic_key: keys.anthropic_key,
                    google_key: keys.google_key,
                    openrouter_key: keys.openrouter_key,
                    created_at: keys.created_at,
                    updated_at: keys.updated_at
                });
            
            if (error) {
                console.error(`❌ Error migrating API keys for ${keys.user_id}:`, error.message);
            } else {
                console.log(`✅ Migrated API keys for: ${keys.user_id}`);
            }
        }
    } catch (error) {
        console.error('❌ Error migrating admin API keys:', error);
        throw error;
    }
}

/**
 * Migrate token models
 */
async function migrateTokenModels() {
    console.log('\n🎯 Migrating token models...');
    
    try {
        const models = await dbAll('SELECT * FROM token_models');
        
        if (models.length === 0) {
            console.log('⚠️  No token models found in local database');
            return;
        }
        
        console.log(`Found ${models.length} token model(s)`);
        
        for (const model of models) {
            const { data, error } = await supabase
                .from('token_models')
                .upsert({
                    id: model.id,
                    name: model.name,
                    display_name: model.display_name,
                    description: model.description,
                    ai_provider: model.ai_provider,
                    model_id: model.model_id,
                    token_cost: model.token_cost,
                    custom_system_prompt: model.custom_system_prompt,
                    temperature: model.temperature,
                    max_tokens: model.max_tokens,
                    tags: model.tags,
                    is_active: model.is_active === 1,
                    created_at: model.created_at,
                    updated_at: model.updated_at
                });
            
            if (error) {
                console.error(`❌ Error migrating token model ${model.name}:`, error.message);
            } else {
                console.log(`✅ Migrated token model: ${model.name}`);
            }
        }
    } catch (error) {
        console.error('❌ Error migrating token models:', error);
        throw error;
    }
}

/**
 * Migrate user tokens
 */
async function migrateUserTokens() {
    console.log('\n💰 Migrating user token balances...');
    
    try {
        const tokens = await dbAll('SELECT * FROM user_tokens');
        
        if (tokens.length === 0) {
            console.log('⚠️  No user token records found in local database');
            return;
        }
        
        console.log(`Found ${tokens.length} user token record(s)`);
        
        for (const token of tokens) {
            const { data, error } = await supabase
                .from('user_tokens')
                .upsert({
                    user_id: token.user_id,
                    balance: token.balance,
                    lifetime_earned: token.lifetime_earned,
                    lifetime_purchased: token.lifetime_purchased,
                    last_weekly_refill: token.last_weekly_refill,
                    created_at: token.created_at,
                    updated_at: token.updated_at
                });
            
            if (error) {
                console.error(`❌ Error migrating tokens for ${token.user_id}:`, error.message);
            } else {
                console.log(`✅ Migrated tokens for: ${token.user_id} (balance: ${token.balance})`);
            }
        }
    } catch (error) {
        console.error('❌ Error migrating user tokens:', error);
        throw error;
    }
}

/**
 * Migrate token transactions
 */
async function migrateTokenTransactions() {
    console.log('\n📊 Migrating token transactions...');
    
    try {
        const transactions = await dbAll('SELECT * FROM token_transactions ORDER BY created_at');
        
        if (transactions.length === 0) {
            console.log('⚠️  No token transactions found in local database');
            return;
        }
        
        console.log(`Found ${transactions.length} transaction(s)`);
        
        // Insert in batches for efficiency
        const batchSize = 100;
        for (let i = 0; i < transactions.length; i += batchSize) {
            const batch = transactions.slice(i, i + batchSize);
            
            const records = batch.map(tx => ({
                id: tx.id,
                user_id: tx.user_id,
                amount: tx.amount,
                type: tx.type,
                reference: tx.reference,
                balance_after: tx.balance_after,
                created_at: tx.created_at
            }));
            
            const { data, error } = await supabase
                .from('token_transactions')
                .upsert(records);
            
            if (error) {
                console.error(`❌ Error migrating transaction batch ${i / batchSize + 1}:`, error.message);
            } else {
                console.log(`✅ Migrated transaction batch ${i / batchSize + 1} (${batch.length} records)`);
            }
        }
        
        console.log(`✅ Total transactions migrated: ${transactions.length}`);
    } catch (error) {
        console.error('❌ Error migrating token transactions:', error);
        throw error;
    }
}

/**
 * Main migration function
 */
async function runMigration() {
    console.log('🚀 Starting data migration from SQLite to Supabase...');
    console.log('================================================\n');
    
    try {
        // Run migrations in order
        await migrateAdminUsers();
        await migrateAdminApiKeys();
        await migrateTokenModels();
        await migrateUserTokens();
        await migrateTokenTransactions();
        
        console.log('\n================================================');
        console.log('✅ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Verify data in Supabase dashboard');
        console.log('2. Update backend services to use Supabase');
        console.log('3. Remove admin/token tables from SQLite');
        
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migration
runMigration();
