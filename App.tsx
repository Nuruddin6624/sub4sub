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
import { Shield, Chrome, Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);
  
  // Auth Form States
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Setup/Registration State
  const [needsSetup, setNeedsSetup] = useState(false);
  const [userUrl, setUserUrl] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Handle Supabase Hash Conflict (OAuth redirect fixes)
    const handleHashAuth = () => {
        const hash = window.location.hash;
        if (hash.includes('access_token=') || hash.includes('type=recovery')) {
            // If it's not starting with #/ (router format), it's a Supabase raw hash
            if (!hash.startsWith('#/')) {
                // Supabase will handle this automatically, we just need to wait for onAuthStateChange
                console.log("Detected Supabase Auth Hash");
            }
        }
    };
    handleHashAuth();

    initAuth();

    if (supabase) {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                // Clean URL hash if it contains auth tokens
                if (window.location.hash.includes('access_token')) {
                    window.history.replaceState(null, '', window.location.pathname);
                }
                await checkUserProfile(session.user.id, session.user.email!);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setNeedsSetup(false);
                setLoading(false);
            }
        });
        return () => subscription.unsubscribe();
    }
  }, []);

  const initAuth = async () => {
    try {
        const session = await api.getSession();
        if (session?.user) {
            await checkUserProfile(session.user.id, session.user.email!);
        } else {
            const localUser = await api.getUser();
            if (localUser) setUser(localUser);
            setLoading(false);
        }
    } catch (err) {
        setLoading(false);
    }
  };

  const checkUserProfile = async (id: string, userEmail: string) => {
      try {
          const profile = await api.getUser(id);
          if (profile) {
              setUser(profile);
              setNeedsSetup(false);
          } else {
              setEmail(userEmail);
              setNeedsSetup(true);
          }
      } catch (err) {
          setEmail(userEmail);
          setNeedsSetup(true);
      } finally {
          setLoading(false);
      }
  };

  const handleGoogleLogin = async () => {
      try {
          setError('');
          setAuthProcessing(true);
          await api.signInWithGoogle();
      } catch (err: any) {
          setError(err.message);
          setAuthProcessing(false);
      }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setAuthProcessing(true);
      
      // 1. Admin Access
      if (email === 'shamim6624@gmail.com' && password === 'nur6624') {
          const admin = await api.signInAdmin(email, password);
          if (admin) {
              setUser(admin);
              setAuthProcessing(false);
              return;
          }
      }

      // 2. Regular User Flow
      try {
          if (authMode === 'LOGIN') {
              const { user: authUser, error: authError } = await api.signInWithEmail(email, password);
              if (authError) throw new Error(authError);
              if (authUser) await checkUserProfile(authUser.id, authUser.email!);
          } else {
              // SIGN UP mode: Check if profile exists first
              const exists = await api.findUserByEmail(email);
              if (exists) {
                  setError('Account already exists. Please login.');
                  setAuthMode('LOGIN');
              } else {
                  // User exists in setup mode
                  setNeedsSetup(true);
              }
          }
      } catch (err: any) {
          setError(err.message || 'Authentication failed');
      } finally {
          setAuthProcessing(false);
      }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
      e.preventDefault();
      setAuthProcessing(true);
      setError('');
      try {
          if (!userUrl || !userName) throw new Error("Please fill all fields");
          
          // registerUser now handles both Supabase Sign-Up and Profile Creation
          const newUser = await api.registerUser(email, password, userUrl, userName);
          setUser(newUser);
          setNeedsSetup(false);
      } catch (err: any) {
          setError(err.message);
      } finally {
          setAuthProcessing(false);
      }
  };

  const handleLogout = async () => {
      setLoading(true);
      if (supabase) await supabase.auth.signOut();
      localStorage.removeItem('currentUser');
      setUser(null);
      setNeedsSetup(false);
      setEmail('');
      setPassword('');
      setAuthMode('LOGIN');
      setLoading(false);
  };

  if (loading) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-white">
            <Loader2 className="w-10 h-10 text-brand-600 animate-spin mb-4" />
            <p className="text-gray-400 font-medium animate-pulse">Syncing Session...</p>
        </div>
    );
  }

  // --- AUTH SCREEN ---
  if (!user && !needsSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white">
           <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-10 text-white text-center">
               <div className="flex flex-col items-center">
                   <div className="bg-white/20 p-4 rounded-3xl backdrop-blur-xl mb-4 shadow-xl">
                       <Shield size={40} className="text-white" />
                   </div>
                   <h1 className="text-3xl font-black tracking-tight">SubXchange</h1>
                   <p className="text-brand-100 text-sm mt-1 font-medium">Real Users. Real Growth.</p>
               </div>
           </div>

           <div className="p-8">
               {error && (
                   <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-2xl border border-red-100 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                       {error}
                   </div>
               )}

               <div className="space-y-6">
                   <button 
                     onClick={handleGoogleLogin}
                     disabled={authProcessing}
                     className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center justify-center space-x-3 active:scale-[0.98] disabled:opacity-50"
                   >
                       <Chrome size={22} className="text-red-500" />
                       <span>Continue with Google</span>
                   </button>

                   <div className="relative flex items-center py-2">
                       <div className="flex-grow border-t border-gray-100"></div>
                       <span className="flex-shrink mx-4 text-gray-300 text-[10px] uppercase font-black tracking-widest">Or Use Email</span>
                       <div className="flex-grow border-t border-gray-100"></div>
                   </div>

                   <form onSubmit={handleEmailAuth} className="space-y-4">
                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Email Address</label>
                           <input 
                             type="email" required
                             className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 transition-all outline-none text-gray-700 font-medium"
                             placeholder="email@example.com"
                             value={email}
                             onChange={e => setEmail(e.target.value)}
                           />
                       </div>

                       <div className="space-y-1.5">
                           <label className="text-[10px] font-black text-gray-400 uppercase ml-1 tracking-wider">Password</label>
                           <input 
                             type="password" required
                             className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-brand-500 transition-all outline-none text-gray-700 font-medium"
                             placeholder="••••••••"
                             value={password}
                             onChange={e => setPassword(e.target.value)}
                           />
                       </div>

                       <button 
                         type="submit"
                         disabled={authProcessing}
                         className="w-full bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-brand-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                           {authProcessing ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'LOGIN' ? <LogIn size={20} /> : <UserPlus size={20} />)}
                           <span>{authMode === 'LOGIN' ? 'Login' : 'Create Account'}</span>
                       </button>
                   </form>

                   <div className="text-center">
                       <button 
                         onClick={() => { setAuthMode(authMode === 'LOGIN' ? 'SIGNUP' : 'LOGIN'); setError(''); }}
                         className="text-gray-500 text-sm font-semibold hover:text-brand-600"
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

  // --- REGISTRATION SETUP SCREEN ---
  if (needsSetup) {
    return (
        <div className="min-h-screen bg-brand-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-10">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-black text-gray-900 leading-tight">Channel Setup</h2>
                    <p className="text-gray-400 mt-2 font-medium">Link your YouTube to complete registration.</p>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100">{error}</div>}

                <form onSubmit={handleCompleteSetup} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Channel Name</label>
                        <input 
                            type="text" required placeholder="e.g. Rahim Tech"
                            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-brand-500 transition-all font-medium text-gray-700"
                            value={userName}
                            onChange={e => setUserName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">YouTube URL</label>
                        <input 
                            type="url" required placeholder="https://youtube.com/@channel"
                            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl outline-none focus:bg-white focus:border-brand-500 transition-all font-medium text-gray-700"
                            value={userUrl}
                            onChange={e => setUserUrl(e.target.value)}
                        />
                    </div>
                    <button type="submit" disabled={authProcessing} className="w-full bg-brand-600 text-white font-bold py-5 rounded-2xl shadow-xl hover:bg-brand-700 transition-all disabled:opacity-50 flex justify-center items-center">
                        {authProcessing ? <Loader2 className="animate-spin" /> : 'Complete Registration'}
                    </button>
                    <button type="button" onClick={handleLogout} className="w-full text-gray-400 text-sm font-bold mt-2">Cancel</button>
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
