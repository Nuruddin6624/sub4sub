import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Earn from './pages/Earn';
import Store from './pages/Store';
import Promote from './pages/Promote';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { User } from './types';
import { api } from './services/supabase';
import { Shield, Lock, ArrowLeft, LogIn } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref to access latest user state inside setInterval closure
  const userRef = useRef<User | null>(null);

  // Login Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Registration State (If user not found)
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [userUrl, setUserUrl] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
      userRef.current = user;
  }, [user]);

  // Background Polling
  useEffect(() => {
    checkUser();

    // Poll every 60 seconds to refresh coins/stats
    const intervalId = setInterval(() => {
        if (userRef.current) {
            checkUser(true); // Silent refresh
        }
    }, 60000);

    return () => clearInterval(intervalId);
  }, []);

  const checkUser = async (silent = false) => {
    if (!silent) setLoading(true);
    const u = await api.getUser();
    setUser(u);
    if (!silent) setLoading(false);
  };

  const handleLogout = () => {
      localStorage.removeItem('currentUser');
      setUser(null);
      // Reset States
      setEmail('');
      setPassword('');
      setShowRegisterForm(false);
      setLoginError('');
  };

  const handleUnifiedLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');

      if (!email || !password) {
          setLoginError('Please enter both email and password.');
          return;
      }

      // 1. Check if ADMIN credentials
      if (email === 'shamim6624@gmail.com') {
          if (password === 'nur6624') {
              const admin = await api.loginAdmin(email, password);
              if (admin) {
                  setUser(admin);
                  return;
              } else {
                  setLoginError('Admin Login Failed.');
                  return;
              }
          } else {
              setLoginError('Incorrect Password for Admin.');
              return;
          }
      }

      // 2. Regular User Login Flow
      // Check if user exists in our "Mock DB"
      const existingUser = await api.findUserByEmail(email);
      
      if (existingUser) {
          // User exists, log them in
          // Note: In this mock, we don't strictly validate user passwords because we didn't store them.
          // In a real app, you would verify hash(password) here.
          setUser(existingUser);
          if (localStorage) localStorage.setItem('currentUser', JSON.stringify(existingUser));
      } else {
          // User does NOT exist -> Redirect to Registration (Channel Info)
          setShowRegisterForm(true);
      }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
      e.preventDefault();
      if(email && userUrl) {
          // Register the new user with the email provided in the first step
          const u = await api.registerUser(email, userUrl, userName || 'My Channel');
          setUser(u);
      }
  };

  if (loading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-brand-600">Loading...</div>;
  }

  // Auth Flow
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-500 to-brand-700 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-gray-800">
           
           {/* Header Icon */}
           <div className="flex justify-center mb-6">
               <div className="bg-brand-100 p-3 rounded-full">
                   <Shield className="text-brand-600 w-8 h-8" />
               </div>
           </div>

           {!showRegisterForm ? (
               // ==========================
               // UNIFIED LOGIN FORM
               // ==========================
               <>
                   <h1 className="text-2xl font-bold text-center mb-2">Welcome Back</h1>
                   <p className="text-center text-gray-500 mb-6 text-sm">Login to manage your channel growth.</p>

                   <form onSubmit={handleUnifiedLogin} className="space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email Address</label>
                           <input 
                             type="email" 
                             required
                             className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                             value={email}
                             onChange={e => setEmail(e.target.value)}
                             placeholder="name@example.com"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label>
                           <input 
                             type="password" 
                             required
                             className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                             value={password}
                             onChange={e => setPassword(e.target.value)}
                             placeholder="••••••••"
                           />
                       </div>
                       
                       {loginError && <p className="text-red-500 text-sm bg-red-50 p-2 rounded border border-red-100">{loginError}</p>}

                       <button 
                         type="submit"
                         className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-brand-700 transition flex items-center justify-center space-x-2"
                       >
                           <LogIn size={20} />
                           <span>Login</span>
                       </button>
                   </form>
                   <p className="text-center text-xs text-gray-400 mt-4">New users will be asked to link channel after login.</p>
               </>
           ) : (
               // ==========================
               // NEW USER REGISTRATION
               // ==========================
               <>
                   <div className="flex items-center mb-4">
                       <button onClick={() => setShowRegisterForm(false)} className="p-1 hover:bg-gray-100 rounded-full mr-2">
                           <ArrowLeft size={20} className="text-gray-500"/>
                       </button>
                       <h1 className="text-xl font-bold">Setup Profile</h1>
                   </div>
                   <p className="text-sm text-gray-500 mb-6">
                       Creating account for <strong>{email}</strong>.<br/>
                       Link your YouTube channel to start earning.
                   </p>
                   
                   <form onSubmit={handleCompleteRegistration} className="space-y-4">
                       <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">YouTube Channel URL</label>
                          <input 
                            type="url" 
                            required 
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="https://youtube.com/@yourchannel"
                            value={userUrl}
                            onChange={e => setUserUrl(e.target.value)}
                          />
                       </div>
                       <div>
                          <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Channel Name</label>
                          <input 
                            type="text" 
                            required 
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            placeholder="e.g. My Vlog"
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                          />
                       </div>
                       <button type="submit" className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-brand-700 transition mt-2">
                          Complete Setup
                       </button>
                   </form>
               </>
           )}
        </div>
      </div>
    );
  }

  // LOGGED IN
  const isAdmin = user.email === 'shamim6624@gmail.com';

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {isAdmin ? (
            // ADMIN VIEW
            <Routes>
                <Route path="*" element={<Admin onLogout={handleLogout} />} />
            </Routes>
        ) : (
            // USER VIEW
            <>
                <Routes>
                    <Route path="/" element={<Home user={user} />} />
                    <Route path="/earn" element={<Earn user={user} refreshUser={() => checkUser(true)} />} />
                    <Route path="/store" element={<Store user={user} refreshUser={() => checkUser(true)} />} />
                    <Route path="/promote" element={<Promote user={user} refreshUser={() => checkUser(true)} />} />
                    <Route path="/profile" element={<Profile user={user} refreshUser={() => checkUser(true)} onLogout={handleLogout} />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Navbar user={user} />
            </>
        )}
      </div>
    </HashRouter>
  );
};

export default App;
