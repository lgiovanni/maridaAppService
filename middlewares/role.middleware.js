const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'No autorizado' });
      }

      const hasRequiredRole = req.user.roles.some(role => allowedRoles.includes(role));
      
      if (!hasRequiredRole) {
        return res.status(403).json({
          message: 'No tienes los permisos necesarios para realizar esta acción'
        });
      }

      // Verificar permisos específicos según el rol
      if (req.user.roles.includes('agency_owner')) {
        if (!req.user.agency.isOwner) {
          return res.status(403).json({
            message: 'No tienes los permisos de propietario de agencia'
          });
        }
      }

      if (req.user.roles.includes('emitter')) {
        if (!req.user.emitter.isActive) {
          return res.status(403).json({
            message: 'Tu cuenta de emisor no está activa'
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  roleMiddleware
};