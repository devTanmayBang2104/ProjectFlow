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

const primaryUrl = process.env.DATABASE_URL;
const readReplicaUrl = process.env.DATABASE_READ_URL || primaryUrl;
const hasDistinctReplica = !!(process.env.DATABASE_READ_URL && process.env.DATABASE_READ_URL !== primaryUrl);

console.log('DB.ts: Initializing Primary Pool with URL:', primaryUrl ? '(Loaded)' : '(UNDEFINED!)');
if (hasDistinctReplica) {
  console.log('[CQRS] Read Replica Pool initialized for query splitting.');
}

// 1. Primary Node Connection Pool (Writes & Transactions)
const primaryPool = new Pool({
  connectionString: primaryUrl,
  ssl: { rejectUnauthorized: false },
});
const primaryAdapter = new PrismaPg(primaryPool);
export const primaryPrisma = new PrismaClient({
  adapter: primaryAdapter,
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// 2. Read-Replica Node Connection Pool (Reads & Analytics)
export const replicaPrisma = hasDistinctReplica
  ? new PrismaClient({
      adapter: new PrismaPg(
        new Pool({
          connectionString: readReplicaUrl,
          ssl: { rejectUnauthorized: false },
        })
      ),
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  : primaryPrisma;

// Set of operations classified for CQRS read routing
const READ_OPERATIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
]);

/**
 * CQRS Transparent Proxy:
 * Automatically routes read operations (findMany, count, aggregate, etc.) to the Read-Replica,
 * and write operations (create, update, delete, upsert, $transaction) to the Primary database.
 */
function createCqrsPrismaProxy(primary: PrismaClient, replica: PrismaClient): PrismaClient {
  return new Proxy(primary, {
    get(target: any, prop: string | symbol) {
      // Top-level direct methods
      if (prop === '$queryRaw' || prop === '$queryRawUnsafe') {
        return (...args: any[]) => (replica as any)[prop](...args);
      }
      if (prop === '$executeRaw' || prop === '$executeRawUnsafe' || prop === '$transaction') {
        return (...args: any[]) => (primary as any)[prop](...args);
      }
      if (prop === '$connect') {
        return async () => {
          await primary.$connect();
          if (hasDistinctReplica) await replica.$connect();
        };
      }
      if (prop === '$disconnect') {
        return async () => {
          await primary.$disconnect();
          if (hasDistinctReplica) await replica.$disconnect();
        };
      }

      const originalModel = target[prop];
      if (originalModel && typeof originalModel === 'object') {
        const replicaModel = (replica as any)[prop];

        return new Proxy(originalModel, {
          get(modelTarget: any, action: string | symbol) {
            if (typeof action === 'string' && READ_OPERATIONS.has(action) && replicaModel) {
              return (...args: any[]) => replicaModel[action](...args);
            }
            return modelTarget[action];
          },
        });
      }

      return target[prop];
    },
  });
}

const cqrsPrisma = createCqrsPrismaProxy(primaryPrisma, replicaPrisma);

export const db = {
  read: replicaPrisma,
  write: primaryPrisma,
  isReplicaActive: hasDistinctReplica,
};

export default cqrsPrisma;
