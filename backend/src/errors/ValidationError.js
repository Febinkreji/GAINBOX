import { AppError } from './AppError.js'

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data', details = undefined) {
    super(message, 422)
    this.details = details
  }
}
