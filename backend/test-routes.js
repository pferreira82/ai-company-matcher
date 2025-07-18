const express = require('express');

console.log('Testing routes individually...\n');

// Test each route file WITHOUT mounting to see which one fails
console.log('1. Testing profile routes...');
try {
    const profileRoutes = require('./routes/profile');
    console.log('✅ Profile routes loaded successfully\n');
} catch (error) {
    console.error('❌ Profile routes failed:', error.message, '\n');
}

console.log('2. Testing companies routes...');
try {
    const companiesRoutes = require('./routes/companies');
    console.log('✅ Companies routes loaded successfully\n');
} catch (error) {
    console.error('❌ Companies routes failed:', error.message, '\n');
}

console.log('3. Testing emails routes...');
try {
    const emailRoutes = require('./routes/emails');
    console.log('✅ Email routes loaded successfully\n');
} catch (error) {
    console.error('❌ Email routes failed:', error.message, '\n');
}

console.log('4. Testing aiSearch routes...');
try {
    const searchRoutes = require('./routes/aiSearch');
    console.log('✅ Search routes loaded successfully\n');
} catch (error) {
    console.error('❌ Search routes failed:', error.message, '\n');
}

console.log('5. Testing config routes...');
try {
    const configRoutes = require('./routes/config');
    console.log('✅ Config routes loaded successfully\n');
} catch (error) {
    console.error('❌ Config routes failed:', error.message, '\n');
}

// Now test mounting each one
console.log('\n--- Testing route mounting ---\n');

const app = express();

console.log('Mounting profile routes...');
try {
    const profileRoutes = require('./routes/profile');
    app.use('/api/profile', profileRoutes);
    console.log('✅ Profile routes mounted\n');
} catch (error) {
    console.error('❌ Profile mounting failed:', error.message, '\n');
}

console.log('Mounting companies routes...');
try {
    const companiesRoutes = require('./routes/companies');
    app.use('/api/companies', companiesRoutes);
    console.log('✅ Companies routes mounted\n');
} catch (error) {
    console.error('❌ Companies mounting failed:', error.message, '\n');
}

console.log('Mounting emails routes...');
try {
    const emailRoutes = require('./routes/emails');
    app.use('/api/emails', emailRoutes);
    console.log('✅ Email routes mounted\n');
} catch (error) {
    console.error('❌ Email mounting failed:', error.message, '\n');
}

console.log('Mounting search routes...');
try {
    const searchRoutes = require('./routes/aiSearch');
    app.use('/api/search', searchRoutes);
    console.log('✅ Search routes mounted\n');
} catch (error) {
    console.error('❌ Search mounting failed:', error.message, '\n');
}

console.log('Mounting config routes...');
try {
    const configRoutes = require('./routes/config');
    app.use('/api/config', configRoutes);
    console.log('✅ Config routes mounted\n');
} catch (error) {
    console.error('❌ Config mounting failed:', error.message, '\n');
}

console.log('All tests completed');