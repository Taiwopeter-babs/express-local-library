const { createClient } = require('redis');

// redis client
const redisClient = createClient();

// event handler for unsuccessful connection
redisClient.on('error', async (error) => {
    console.log(`Client connection error: ${error.message}`);
    // await redisClient.disconnect();
    setTimeout(() =>
        connectToRedis()
            .then(() => {
                console.log('Reconnected');
            }),
        10000)
});

/**
 * connect to redis
 */
async function connectToRedis() {
    if (redisClient.isOpen) {
        console.log('Connected to redis.');
    } else {
        await redisClient.connect();
    }
    // event handler for `ready` connections 
    if (redisClient.isReady) {
        console.log('Connected to redis and ready for connections...');
    }
    return;
};
connectToRedis();



// redis has been disconnected via .quit() or .disconnect()
redisClient.on('end', async () => {
    await redisClient.quit();
});

// Quit redis on CTRL + C
process.on('SIGINT', () => {
    console.log('Disconnected from redis.')
});

module.exports = redisClient;
