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
import { Shield, Lock, ArrowLeft } from 'lucide-react';

// SECRET ADMIN ROUTE - Change this to whatever you want
const ADMIN_ROUTE = "/secret-admin-panel";

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Use ref to access latest user state inside setInterval closure
  const userRef = useRef<User | null>(null);

  // Login View State
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // User "Google" Login State (Mock)
  const [userEmail, setUserEmail] = useState('');
  const [showUserForm, setShowUserForm] = useState(false);
  const [userUrl, setUserUrl] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
      userRef.current = user;
  }, [user]);

  // Background Polling
  useEffect(() => {
    checkUser();

    // Check if URL is the secret admin route on load
    if (window.location.hash === `#${ADMIN_ROUTE}`) {
        setIsAdminMode(true);
    }

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
      setIsAdminMode(false);
      window.location.hash = ''; // Reset route
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoginError('');
      const admin = await api.loginAdmin(adminEmail, adminPass);
      if (admin) {
          setUser(admin);
      } else {
          setLoginError('Invalid admin credentials');
      }
  };

  const handleGoogleLoginMock = (e: React.FormEvent) => {
      e.preventDefault();
      // Simulate Google Login Flow
      if(userEmail) {
          // Check if trying to login as admin via user flow
          if (userEmail === 'shamim6624@gmail.com') {
              setLoginError('Please use Admin Login for this account.');
              return;
          }
          setShowUserForm(true); // Proceed to ask for channel details (simulating new account setup)
      }
  };

  const handleCompleteUserRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if(userEmail && userUrl) {
          const u = await api.registerUser(userEmail, userUrl, userName || 'My Channel');
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
                   {isAdminMode ? <Lock className="text-brand-600 w-8 h-8" /> : <Shield className="text-brand-600 w-8 h-8" />}
               </div>
           </div>

           {isAdminMode ? (
               // ADMIN LOGIN FORM
               <>
                   <div className="flex items-center mb-4">
                       <button onClick={() => { setIsAdminMode(false); setLoginError(''); window.location.hash = ''; }} className="p-1 hover:bg-gray-100 rounded-full mr-2">
                           <ArrowLeft size={20} className="text-gray-500"/>
                       </button>
                       <h1 className="text-xl font-bold">Admin Login</h1>
                   </div>
                   
                   <form onSubmit={handleAdminLogin} className="space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email</label>
                           <input 
                             type="email" 
                             className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                             value={adminEmail}
                             onChange={e => setAdminEmail(e.target.value)}
                             placeholder="admin@example.com"
                           />
                       </div>
                       <div>
                           <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Password</label>
                           <input 
                             type="password" 
                             className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                             value={adminPass}
                             onChange={e => setAdminPass(e.target.value)}
                             placeholder="••••••••"
                           />
                       </div>
                       
                       {loginError && <p className="text-red-500 text-sm">{loginError}</p>}

                       <button type="submit" className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-gray-900 transition">
                           Access Panel
                       </button>
                   </form>
               </>
           ) : (
               // USER LOGIN (GOOGLE MOCK)
               <>
                   {!showUserForm ? (
                       <>
                           <h1 className="text-2xl font-bold text-center mb-2">Welcome to SubXchange</h1>
                           <p className="text-center text-gray-500 mb-8 text-sm">Real engagement. No bots. Secure.</p>

                           <form onSubmit={handleGoogleLoginMock} className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Enter Gmail to Continue</label>
                                   <input 
                                     type="email" 
                                     required
                                     className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                     value={userEmail}
                                     onChange={e => setUserEmail(e.target.value)}
                                     placeholder="example@gmail.com"
                                   />
                               </div>
                               {loginError && <p className="text-red-500 text-sm">{loginError}</p>}
                               
                               <button 
                                 type="submit"
                                 className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-3 rounded-xl shadow-sm hover:bg-gray-50 transition flex items-center justify-center space-x-3"
                               >
                                   <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                                   <span>Sign in with Google</span>
                               </button>
                           </form>
                           
                           {/* HIDDEN ADMIN LOGIN - Removed the button to meet requirement */}
                           <div className="mt-8 text-center opacity-0 hover:opacity-100 transition-opacity duration-1000">
                               <p className="text-[10px] text-gray-300">v1.2.4 Secure Build</p>
                           </div>
                       </>
                   ) : (
                       <>
                           {/* Step 2: Channel Info */}
                           <div className="flex items-center mb-4">
                               <button onClick={() => setShowUserForm(false)} className="p-1 hover:bg-gray-100 rounded-full mr-2">
                                   <ArrowLeft size={20} className="text-gray-500"/>
                               </button>
                               <h1 className="text-xl font-bold">One Last Step</h1>
                           </div>
                           <p className="text-sm text-gray-500 mb-6">Link your YouTube channel to start earning.</p>
                           
                           <form onSubmit={handleCompleteUserRegister} className="space-y-4">
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
            // =========================
            // ADMIN APP (No Navbar)
            // =========================
            <Routes>
                <Route path={ADMIN_ROUTE} element={<Admin onLogout={handleLogout} />} />
                {/* Redirect any other route to /secret-admin-panel if logged in as admin */}
                <Route path="*" element={<Navigate to={ADMIN_ROUTE} replace />} />
            </Routes>
        ) : (
            // =========================
            // USER APP (With Navbar)
            // =========================
            <>
                <Routes>
                    <Route path="/" element={<Home user={user} />} />
                    <Route path="/earn" element={<Earn user={user} refreshUser={() => checkUser(true)} />} />
                    <Route path="/store" element={<Store user={user} refreshUser={() => checkUser(true)} />} />
                    <Route path="/promote" element={<Promote user={user} refreshUser={() => checkUser(true)} />} />
                    <Route path="/profile" element={<Profile user={user} refreshUser={() => checkUser(true)} onLogout={handleLogout} />} />
                    {/* HIDE ADMIN ROUTE FROM REGULAR USERS */}
                    <Route path={ADMIN_ROUTE} element={
                        <div className="flex h-screen items-center justify-center flex-col p-4 text-center">
                            <h1 className="text-xl font-bold mb-2">Access Denied</h1>
                            <p className="text-gray-500">You do not have permission to view this page.</p>
                        </div>
                    } />
                    {/* Redirect unknown routes to home */}
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