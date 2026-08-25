import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const currentUser = authService.getCurrentUser();

  if (!currentUser) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(currentUser.role)) {
    // If role is unauthorized, redirect to their corresponding dashboard
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (currentUser.role === 'buyer') {
      return <Navigate to="/buyer" replace />;
    } else if (currentUser.role === 'freelancer') {
      return <Navigate to="/seller" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
