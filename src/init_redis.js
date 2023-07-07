import { createClient } from 'redis';

// redis client
const redisClient = createClient();

// event handler for unsuccessful connection
redisClient.on('error', async (error) => {
    console.log(`Client connection error: ${error.message}`);
    await redisClient.disconnect();
    return false;
});

// event handler for successful connection
await redisClient.connect();
if (redisClient.isOpen) {
    console.log('Connected to redis.');
}

// event handler for `ready` connections 
if (redisClient.isReady) {
    console.log('Connected to redis and ready for connections...');
}

// redis has been disconnected via .quit() or .disconnect()
redisClient.on('end', async () => {
    await redisClient.quit();
});

// Quit redis on CTRL + C
process.on('SIGINT', () => {
    console.log('Disconnected from redis.')
});

export default redisClient;
