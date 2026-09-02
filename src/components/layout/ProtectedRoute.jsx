import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

// Normalize role: backend uses 'seller', legacy/demo data uses 'freelancer' — treat as equivalent
function normalizeRole(role) {
  if (role === 'freelancer') return 'seller';
  return role;
}

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  const userRole = normalizeRole(currentUser.role);

  if (allowedRoles.length > 0) {
    // Normalize allowed roles as well for comparison
    const normalizedAllowed = allowedRoles.map(normalizeRole);
    if (!normalizedAllowed.includes(userRole)) {
      // Redirect to the user's own dashboard
      if (userRole === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (userRole === 'buyer') {
        return <Navigate to="/buyer" replace />;
      } else if (userRole === 'seller') {
        return <Navigate to="/seller" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
