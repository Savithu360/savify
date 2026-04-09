// Error types for API error handling

export enum ErrorType {
  NETWORK_ERROR = 'network_error',
  CORS_ERROR = 'cors_error',
  AUTH_ERROR = 'auth_error',
  RATE_LIMIT = 'rate_limit',
  DATA_ERROR = 'data_error',
  TIMEOUT = 'timeout',
  SERVER_ERROR = 'server_error',
  CLIENT_ERROR = 'client_error',
}

export class APIError extends Error {
  public type: ErrorType;
  public status: number;
  public userMessage: string;
  public code: string;
  public retryable: boolean;
  public retryAfter?: number;
  public context?: any;

  constructor(options: {
    type: ErrorType;
    status: number;
    message: string;
    userMessage?: string;
    code: string;
    retryable: boolean;
    retryAfter?: number;
    context?: any;
  }) {
    super(options.message);
    this.name = 'APIError';
    this.type = options.type;
    this.status = options.status;
    this.userMessage = options.userMessage || this.getDefaultUserMessage(options.type);
    this.code = options.code;
    this.retryable = options.retryable;
    this.retryAfter = options.retryAfter;
    this.context = options.context;
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK_ERROR:
        return 'Check your internet connection and try again';
      case ErrorType.CORS_ERROR:
        return 'Unable to access music service. Please try again';
      case ErrorType.AUTH_ERROR:
        return 'Music service temporarily unavailable';
      case ErrorType.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again';
      case ErrorType.TIMEOUT:
        return 'Request timed out. Please try again';
      case ErrorType.SERVER_ERROR:
        return 'Music service is temporarily down. Please try again later';
      case ErrorType.CLIENT_ERROR:
        return 'Invalid request. Please refresh the page';
      case ErrorType.DATA_ERROR:
        return 'Unable to process music data. Please try again';
      default:
        return 'An unexpected error occurred. Please try again';
    }
  }
}
