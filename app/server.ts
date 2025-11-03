import { createApp } from 'honox/server';
import { configureLogging } from '../src/lib/logger';

// Configure logging on server startup
configureLogging().catch(console.error);

export default createApp();
