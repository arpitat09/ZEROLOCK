import app from './app';
import { connectDatabase } from './config/db';
import { config } from './config';

const startServer = async () => {
  try {
    await connectDatabase();

    const server = app.listen(config.port, () => {
      console.log(`
=============================================================
  🔒 ZEROLOCK – Zero-Knowledge Secure Notes Backend Running
  🌐 Server Port: ${config.port}
  🛡️  Environment: ${config.nodeEnv}
  🔐 Zero-Knowledge Invariant: ACTIVE (No Plaintext Access)
=============================================================
      `);
    });

    const gracefulShutdown = () => {
      console.log('\nShutting down ZEROLOCK backend gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
};

startServer();
