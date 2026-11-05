import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from './env.schema';

@Injectable()
export class TypedConfigService {
  constructor(private readonly config: ConfigService<AppEnv, true>) {}

  get<K extends keyof AppEnv>(key: K): AppEnv[K] {
    return this.config.get(key, { infer: true }) as AppEnv[K];
  }

  get isProd(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get isDev(): boolean {
    return this.get('NODE_ENV') === 'development';
  }
}
