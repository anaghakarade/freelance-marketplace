import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

const Layout = ({ children }) => {
  return (
    <>
      <Navbar />
      <main className="main-content">
        {children || <Outlet />}
      </main>
      <Footer />
    </>
  );
};

export default Layout;
