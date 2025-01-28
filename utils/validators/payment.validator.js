const validateWithdrawalRequest = (amount, method) => {
  // Validar monto
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return 'El monto debe ser un número positivo';
  }

  // Validar método de pago
  const validMethods = ['paypal', 'binance', 'epay'];
  if (!method || !validMethods.includes(method)) {
    return `Método de pago inválido. Debe ser uno de: ${validMethods.join(', ')}`;
  }

  // Validar límites de retiro
  const minWithdrawal = 10; // $10 USD
  const maxWithdrawal = 10000; // $10,000 USD

  if (amount < minWithdrawal) {
    return `El monto mínimo de retiro es $${minWithdrawal} USD`;
  }

  if (amount > maxWithdrawal) {
    return `El monto máximo de retiro es $${maxWithdrawal} USD`;
  }

  return null;
};

module.exports = {
  validateWithdrawalRequest
};