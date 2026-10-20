import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ZodSchema } from 'zod';

@Injectable()
export class ZodBodyPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}
  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
    }
    return result.data;
  }
}
