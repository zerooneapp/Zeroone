const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 5) {
                console.log('Max Redis reconnect retries reached. Caching is disabled.');
                return new Error('Max retries reached');
            }
            return Math.min(retries * 50, 2000);
        }
    }
});

let errorLogged = false;
client.on('error', (err) => {
    if (!errorLogged) {
        console.log('Redis Client Error', err.message);
        errorLogged = true;
    }
});
client.on('connect', () => console.log('Redis Client Connected'));

(async () => {
    try {
        await client.connect();
    } catch (err) {
        console.error('Could not connect to Redis, caching will be disabled:', err.message);
    }
})();

module.exports = client;
