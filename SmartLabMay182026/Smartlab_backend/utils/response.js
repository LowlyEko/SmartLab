const success = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const error = (res, message = 'Internal Server Error', statusCode = 500, details = null) => {
  res.status(statusCode).json({
    success: false,
    message,
    details
  });
};

module.exports = { success, error };