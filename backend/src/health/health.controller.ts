import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public() @Get()
  status() {
    return { status: 'ok', service: 'sistema-cartera-api', timestamp: new Date().toISOString() };
  }
}
