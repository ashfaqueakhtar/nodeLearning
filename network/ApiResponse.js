// Shared response formatter for all API routes.
class ApiResponse {
  static send(res, statusCode, success, message, data = null) {
    return res.status(statusCode).json({
      success,
      message,
      data,
    });
  }
}

module.exports = ApiResponse;