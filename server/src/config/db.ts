import dotenv from 'dotenv';
dotenv.config();

import dns from 'dns';
// Resilient DNS fallback for cloud databases
const publicResolver = new dns.Resolver();
publicResolver.setServers(['8.8.8.8', '1.1.1.1']);
const originalLookup = dns.lookup;
(dns as any).lookup = function (hostname: string, options: any, callback: any) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  originalLookup(hostname, options, (err: any, address: any, family: any) => {
    if (err && hostname && (hostname.includes('neon.tech') || hostname.includes('aws'))) {
      publicResolver.resolve4(hostname, (resErr, addresses) => {
        if (!resErr && addresses && addresses.length > 0) {
          if (options && options.all) {
            return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
          }
          return callback(null, addresses[0], 4);
        }
        callback(err, address, family);
      });
    } else {
      callback(err, address, family);
    }
  });
};

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

console.log('DB.ts: Initializing Pool with URL:', process.env.DATABASE_URL ? '(Loaded)' : '(UNDEFINED!)');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
});

export default prisma;
