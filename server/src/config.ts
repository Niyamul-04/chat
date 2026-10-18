import dotenv from 'dotenv';
import path from 'path';

// Load from cwd, server directory, or workspace root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dev.db';
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'chatsphere_super_secret_jwt_key_2026_dev_prod',
  turnUrl: process.env.TURN_URL || '',
  turnUsername: process.env.TURN_USERNAME || '',
  turnCredential: process.env.TURN_CREDENTIAL || '',
  isProduction: process.env.NODE_ENV === 'production',
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, '../uploads'),
};
