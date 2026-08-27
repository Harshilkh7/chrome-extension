module.exports = (err, req, res, next) => {
  console.error('ErrorHandler:', err);

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
  });
};
