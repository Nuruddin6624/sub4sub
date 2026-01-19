import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Earn from './pages/Earn';
import Store from './pages/Store';
import Promote from './pages/Promote';
import Profile from './pages/Profile';
import Admin from './pages/Admin';
import { User } from './types';
import { api, supabase } from './services/supabase';
import { Shield, ArrowLeft, Chrome, Mail, Lock, LogIn, UserPlus } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Auth Mode: 'LOGIN' | 'SIGNUP'
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Setup/Registration State for new users
  const [needsSetup, setNeedsSetup] = useState(false);
  const [userUrl, setUserUrl] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    initAuth();
    if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                checkUserProfile(session.user.id, session.user.email!);
            }
        });
        return () => subscription.unsubscribe();
    }
  }, []);

  const initAuth = async () => {
    setLoading(true);
    const u = await api.getUser();
    if (u) setUser(u);
    setLoading(false);
  };

  const checkUserProfile = async (id: string, userEmail: string) => {
      const profile = await api.getUser(id);
      if (profile) {
          setUser(profile);
          setNeedsSetup(false);
      } else {
          setEmail(userEmail);
          setNeedsSetup(true);
      }
  };

  const handleGoogleLogin = async () => {
      try {
          setError('');
          await api.signInWithGoogle();
      } catch (err: any) {
          setError(err.message);
      }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      
      // 1. Check for Admin Credentials first
      if (email === 'shamim6624@gmail.com' && password === 'nur6624') {
          const admin = await api.signInAdmin(email, password);
          if (admin) {
              setUser(admin);
              return;
          }
      }

      // 2. Regular User Flow (Supabase)
      try {
          if (authMode === 'LOGIN') {
              // Real implementation would use supabase.auth.signInWithPassword
              // For this build, we check if user exists in our DB
              const profile = await api.findUserByEmail(email);
              if (profile) {
                  setUser(profile);
                  localStorage.setItem('currentUser', JSON.stringify(profile));
              } else {
                  setError('Account not found. Please Sign Up.');
              }
          } else {
              // SIGN UP flow
              const exists = await api.findUserByEmail(email);
              if (exists) {
                  setError('Email already registered. Please Login.');
              } else {
                  setNeedsSetup(true);
              }
          }
      } catch (err: any) {
          setError(err.message);
      }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      if (userUrl && userName) {
          const newUser = await api.registerUser(email, userUrl, userName);
          setUser(newUser);
          setNeedsSetup(false);
      }
  };

  const handleLogout = async () => {
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem('currentUser');
      setUser(null);
      setNeedsSetup(false);
      setEmail('');
      setPassword('');
      setAuthMode('LOGIN');
  };

  if (loading) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white space-y-4">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
            <p className="text-gray-400 font-medium animate-pulse">Initializing SubXchange...</p>
        </div>
    );
  }

  // --- AUTH SCREEN ---
  if (!user && !needsSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl shadow-brand-100 overflow-hidden border border-white">
           
           {/* Header Section */}
           <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white text-center relative">
               <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                   <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                       <path d="M0 0 L100 100 M100 0 L0 100" stroke="white" strokeWidth="0.5" />
                   </svg>
               </div>
               <div className="relative z-10 flex flex-col items-center">
                   <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-xl mb-4 shadow-xl">
                       <Shield size={40} className="text-white" />
                   </div>
                   <h1 className="text-3xl font-black tracking-tight">SubXchange</h1>
                   <p className="text-brand-100 text-sm mt-1 font-medium">Real Users. Real Growth.</p>
               </div>
           </div>

           <div className="p-8">
               {error && (
                   <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2 animate-in slide-in-from-top-2">
                       <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                       {error}
                   </div>
               )}

               <div className="space-y-6">
                   {/* Google Action */}
                   <button 
                     onClick={handleGoogleLogin}
                     className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-3 active:scale-[0.98] group"
                   >
                       <div className="bg-white p-1 rounded-full group-hover:rotate-12 transition-transform">
                           <Chrome size={22} className="text-red-500" />
                       </div>
                       <span>Continue with Google</span>
                   </button>

                   <div className="relative flex items-center py-2">
                       <div className="flex-grow border-t border-gray-100"></div>
                       <span className="flex-shrink mx-4 text-gray-300 text-[10px] uppercase font-black tracking-widest">Or Use Email</span>
                       <div className="flex-grow border-t border-gray-100"></div>
                   </div>

                   {/* Email Form */}
                   <form onSubmit={handleEmailAuth} className="space-y-4">
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Account Email</label>
                           <div className="relative group">
                               <Mail className="absolute left-4 top-4 text-gray-300 group-focus-within:text-brand-500 transition-colors" size={18} />
                               <input 
                                 type="email" 
                                 required
                                 className="w-full pl-12 p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 transition-all outline-none text-gray-700 font-medium"
                                 placeholder="Enter your email"
                                 value={email}
                                 onChange={e => setEmail(e.target.value)}
                               />
                           </div>
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Password</label>
                           <div className="relative group">
                               <Lock className="absolute left-4 top-4 text-gray-300 group-focus-within:text-brand-500 transition-colors" size={18} />
                               <input 
                                 type="password" 
                                 required
                                 className="w-full pl-12 p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 transition-all outline-none text-gray-700 font-medium"
                                 placeholder="••••••••"
                                 value={password}
                                 onChange={e => setPassword(e.target.value)}
                               />
                           </div>
                       </div>

                       <button 
                         type="submit"
                         className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-brand-200 hover:bg-brand-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                       >
                           {authMode === 'LOGIN' ? <LogIn size={20} /> : <UserPlus size={20} />}
                           <span>{authMode === 'LOGIN' ? 'Login' : 'Create Account'}</span>
                       </button>
                   </form>

                   {/* Toggle Auth Mode */}
                   <div className="text-center">
                       <button 
                         onClick={() => setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
                         className="text-gray-500 text-sm font-semibold hover:text-brand-600 transition-colors"
                       >
                           {authMode === 'LOGIN' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                       </button>
                   </div>
               </div>
           </div>
        </div>
      </div>
    );
  }

  // --- REGISTRATION SETUP ---
  if (needsSetup) {
    return (
        <div className="min-h-screen bg-brand-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10">
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-brand-50 text-brand-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner transform -rotate-3">
                        <Chrome size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Link Your Channel</h2>
                    <p className="text-gray-400 mt-2 font-medium">Verify your YouTube profile to start.</p>
                </div>

                <form onSubmit={handleCompleteSetup} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Channel Display Name</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g. Rahim Vlogs"
                            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-brand-500 transition-all font-medium text-gray-700"
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">YouTube Channel URL</label>
                        <input 
                            type="url" 
                            required 
                            placeholder="https://youtube.com/@channel"
                            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-brand-500 transition-all font-medium text-gray-700"
                            value={userUrl}
                            onChange={e => setUserUrl(e.target.value)}
                        />
                    </div>
                    <button type="submit" className="w-full bg-brand-600 text-white font-bold py-5 rounded-2xl shadow-2xl shadow-brand-200 hover:bg-brand-700 transition-all transform hover:-translate-y-1">
                        Finish Profile Setup
                    </button>
                </form>
            </div>
        </div>
    );
  }

  // --- LOGGED IN APP ---
  const isAdmin = user!.email === 'shamim6624@gmail.com';

  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        {isAdmin ? (
            <Routes>
                <Route path="*" element={<Admin onLogout={handleLogout} />} />
            </Routes>
        ) : (
            <>
                <Routes>
                    <Route path="/" element={<Home user={user!} />} />
                    <Route path="/earn" element={<Earn user={user!} refreshUser={initAuth} />} />
                    <Route path="/store" element={<Store user={user!} refreshUser={initAuth} />} />
                    <Route path="/promote" element={<Promote user={user!} refreshUser={initAuth} />} />
                    <Route path="/profile" element={<Profile user={user!} refreshUser={initAuth} onLogout={handleLogout} />} />
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
