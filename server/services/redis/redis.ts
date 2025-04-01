import { IRedisData, IRedisUserData } from './types';
import Redis from 'ioredis';

export class AppRedis {
  // todo: update type of reisClient to RedisClient once redis fixes bug
  private redisClient: any;
  private defaultExpireInSec = 7 * 24 * 3600;
  constructor() {
    console.log('redis url: ', process.env.REDIS_URL);
    let redisClient;

    try {
      redisClient = new Redis(process.env.REDIS_URL as string);
    } catch (e) {
      console.error('services.redis.connection.error:', e);
    }
    this.redisClient = redisClient;
  }

  getClient() {
    return this.redisClient;
  }

  async setData(data: IRedisData) {
    let { key, val, expireInSec } = data;
    let expire = expireInSec || this.defaultExpireInSec;
    let value = typeof val === 'string' ? val : JSON.stringify(val);
    let result = '';
    console.log('redis.setData:', key, value, expire);
    try {
      result = await this.redisClient.set(key, value);
      this.redisClient.expire(key, expire);
    } catch (err) {
      console.error('redis.setData.error:', err);
    }
    if (result === 'OK') {
      console.log('Redis.setData.success:', key, expire);
    } else {
      console.error('Redis.setData.failure:', key, val, expire);
    }
  }

  async getData(key: string): Promise<string | null> {
    if (!key) {
      return null;
    }
    return await this.redisClient.get(key);
  }

  async clearData(key: string) {
    await this.redisClient.del(key);
  }
}

export const RedisSingleton = new AppRedis();
