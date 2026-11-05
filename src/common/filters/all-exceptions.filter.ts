import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const payload = this.toPayload(exception, status, request.url);

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(payload);
  }

  private toPayload(exception: unknown, status: number, path: string): ErrorBody {
    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { statusCode: status, error: exception.name, message: res, path, timestamp };
      }
      const obj = res as Record<string, unknown>;
      return {
        statusCode: status,
        error: (obj.error as string) ?? exception.name,
        message: (obj.message as string | string[]) ?? exception.message,
        path,
        timestamp,
      };
    }

    return {
      statusCode: status,
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
      path,
      timestamp,
    };
  }
}
