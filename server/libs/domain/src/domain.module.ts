import { DynamicModule, Global, Module, ModuleMetadata, Provider } from '@nestjs/common';
import { APIKeyService } from './api-key';
import { AssetService } from './asset';
import { AuthService } from './auth';
import { DeviceInfoService } from './device-info';
import { MediaService } from './media';
import { OAuthService } from './oauth';
import { SearchService } from './search';
import { ShareService } from './share';
import { SmartInfoService } from './smart-info';
import { StorageService } from './storage';
import { StorageTemplateService } from './storage-template';
import { INITIAL_SYSTEM_CONFIG, SystemConfigService } from './system-config';
import { UserService } from './user';

const providers: Provider[] = [
  AssetService,
  APIKeyService,
  AuthService,
  DeviceInfoService,
  MediaService,
  OAuthService,
  SmartInfoService,
  StorageService,
  StorageTemplateService,
  SystemConfigService,
  UserService,
  ShareService,
  SearchService,
  {
    provide: INITIAL_SYSTEM_CONFIG,
    inject: [SystemConfigService],
    useFactory: async (configService: SystemConfigService) => {
      return configService.getConfig();
    },
  },
];

@Global()
@Module({})
export class DomainModule {
  static register(options: Pick<ModuleMetadata, 'imports'>): DynamicModule {
    return {
      module: DomainModule,
      imports: options.imports,
      providers: [...providers],
      exports: [...providers],
    };
  }
}
