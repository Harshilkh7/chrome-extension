import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const linkClasses = (active) =>
  `relative font-medium transition transform hover:scale-105 ${
    active
      ? "text-blue-700 font-semibold after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:bg-blue-700 after:w-full after:rounded"
      : "text-gray-700 hover:text-blue-700 after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:bg-blue-700 after:w-0 hover:after:w-full after:rounded after:transition-all after:duration-300"
  }`;

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = !!localStorage.getItem('token');
  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsOpen(false);
    navigate('/login');
  };

  const links = isLoggedIn
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/settings', label: 'Settings' },
      ]
    : [];

  return (
    <nav className="backdrop-blur-md bg-white/70 shadow-lg sticky top-0 z-50 border-b border-blue-200">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 text-2xl font-extrabold text-blue-700 tracking-wide">
          <img src="/ep.jpeg" alt="Logo" className="h-10 w-10 rounded-xl shadow-md object-cover" />
          ExtensPro
        </Link>

        {/* Desktop menu */}
        <div className="hidden md:flex space-x-8 items-center">
          <Link to="/" className={linkClasses(isActive('/'))}>Home</Link>
          {links.map((l) => (
            <Link key={l.to} to={l.to} className={linkClasses(isActive(l.to))}>
              {l.label}
            </Link>
          ))}
          {!isLoggedIn && (
            <>
              <Link to="/login" className={linkClasses(isActive('/login'))}>Login</Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition transform hover:scale-105 font-medium"
              >
                Register
              </Link>
            </>
          )}
          {isLoggedIn && (
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition transform hover:scale-105 font-medium"
            >
              Logout
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex items-center text-blue-700"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden bg-white px-6 transition-all duration-300 overflow-hidden ${
          isOpen ? 'max-h-[400px] py-4 opacity-100' : 'max-h-0 py-0 opacity-0'
        }`}
      >
        <Link to="/" onClick={() => setIsOpen(false)} className={`block py-2 ${linkClasses(isActive('/'))}`}>
          Home
        </Link>
        {links.map((l) => (
          <Link
            key={l.to}
            to={l.to}
            onClick={() => setIsOpen(false)}
            className={`block py-2 ${linkClasses(isActive(l.to))}`}
          >
            {l.label}
          </Link>
        ))}
        {isLoggedIn && (
          <button
            onClick={handleLogout}
            className="w-full text-left mt-2 px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-600 hover:text-white transition font-medium"
          >
            Logout
          </button>
        )}
        {!isLoggedIn && (
          <>
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className={`block py-2 ${linkClasses(isActive('/login'))}`}
            >
              Login
            </Link>
            <Link
              to="/register"
              onClick={() => setIsOpen(false)}
              className="block w-full text-center mt-2 px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition font-medium"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
