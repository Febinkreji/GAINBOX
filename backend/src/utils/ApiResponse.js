/**
 * Consistent success-response envelope so every endpoint returns the same
 * shape regardless of which controller wrote it.
 */
export class ApiResponse {
  static send(res, { statusCode = 200, data = null, meta = undefined, message = 'Success' }) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    })
  }
}
