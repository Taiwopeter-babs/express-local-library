const { createClient } = require('redis');

// redis client
const redisClient = createClient();
let timeoutId;

/**
 * connect to redis
 */
async function connectToRedis() {

    await redisClient.connect();
    if (redisClient.isOpen) {
        console.log('Connected to redis.');
    }
    // event handler for `ready` connections 
    if (redisClient.isReady) {
        console.log('Connected to redis and ready for connections...');
    }
    return;
};
connectToRedis();

// event handler for unsuccessful connection
redisClient.on('error', async (error) => {
    console.log(`Client connection error: ${error.message}`);

    if (error.message === 'Connection timeout') {
        timeoutId = setTimeout(() => {
            connectToRedis();
        }, 5000);
    } else {
        await redisClient.quit();
        process.exit(1);
    }
    clearTimeout(timeoutId);

});


// redis has been disconnected via .quit() or .disconnect()
redisClient.on('end', async () => {
    await redisClient.quit();
});

// Quit redis on CTRL + C
process.on('SIGINT', () => {
    if (redisClient.isOpen) {
        console.log('Disconnected from redis.');
    } else {
        console.log('Redis was not open for requests.');
    }
    process.exit();
});

module.exports = redisClient;
