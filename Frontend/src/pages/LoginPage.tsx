import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Mail, Lock, UserPlus, LogIn, Key, Sparkles, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export default function LoginPage() {
  const { loginWithMongoDB, signUpWithMongoDB, error, setError } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLocalLoading(true);

    try {
      if (mode === 'login') {
        if (!email || !password) {
          setError('Email and password are required.');
          setLocalLoading(false);
          return;
        }
        await loginWithMongoDB(email, password);
      } else if (mode === 'register') {
        if (!name || !email || !password) {
          setError('All fields are required.');
          setLocalLoading(false);
          return;
        }
        await signUpWithMongoDB(name, email, password);
        setSuccessMessage('Registration successful!');
      } else if (mode === 'forgot') {
        if (!email) {
          setError('Email is required.');
          setLocalLoading(false);
          return;
        }
        const res = await fetch('/api/v1/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to request OTP');
        }
        setSuccessMessage(`A customized OTP email has been sent to your inbox.${data.dev_otp ? ` [DEV OTP: ${data.dev_otp}]` : ''}`);
        setMode('reset');
      } else if (mode === 'reset') {
        if (!email || !otp || !newPassword) {
          setError('Email, OTP, and New Password are required.');
          setLocalLoading(false);
          return;
        }
        const res = await fetch('/api/v1/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, password: newPassword })
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to reset password');
        }
        setSuccessMessage('Password successfully changed! You can now log in.');
        setMode('login');
        setOtp('');
        setNewPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  // Instant developer demo log in using the backend's quick auth API
  const handleQuickDemoLogin = async (demoRole: 'Admin' | 'Technician' | 'User') => {
    setError(null);
    setSuccessMessage(null);
    setLocalLoading(true);
    try {
      const res = await fetch('/api/v1/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: demoRole })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Demo login failed');
      }
      
      // Store standard session token
      const loggedUser = {
        uid: data.user.uid,
        email: data.user.email,
        role: data.user.role,
        name: data.user.name,
        token: data.token,
      };
      
      localStorage.setItem('maintainiq_user', JSON.stringify(loggedUser));
      window.location.reload(); // Refresh to trigger restore/mount
    } catch (err: any) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3.5 rounded-2xl shadow-xl shadow-indigo-950/40">
            <LayoutDashboard className="h-9 w-9 text-white animate-pulse" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight font-sans">
          MaintainIQ
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400 max-w">
          Smart digital asset management and automated maintenance dispatch
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white shadow-2xl rounded-3xl border border-slate-100 overflow-hidden py-8 px-4 sm:px-10">
          
          {/* Messages Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-2xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Action Failed</p>
                <p className="font-mono text-[10px] font-normal leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Success</p>
                <p className="font-normal leading-relaxed">{successMessage}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-base font-extrabold text-slate-800 text-center mb-1">
              {mode === 'login' && 'Sign In to Your Account'}
              {mode === 'register' && 'Create Your MaintainIQ Account'}
              {mode === 'forgot' && 'Reset Password (OTP)'}
              {mode === 'reset' && 'Enter Verification Code'}
            </h3>
            
            {mode === 'register' && (
              <p className="text-center text-xs text-slate-400">
                Registering grants you standard <strong className="text-slate-600">User</strong> status.
              </p>
            )}

            <form onSubmit={handleAction} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alice Cooper"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-950 font-medium"
                  />
                </div>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@domain.com"
                      disabled={mode === 'reset'}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-950 font-medium disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>
              )}

              {(mode === 'login' || mode === 'register') && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-950 font-medium"
                    />
                  </div>
                </div>
              )}

              {mode === 'reset' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verification OTP (6-digits)</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-center font-mono text-lg font-bold text-slate-950 tracking-widest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">New Account Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-950 font-medium"
                    />
                  </div>
                </div>
              )}

              {mode === 'login' && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={localLoading}
                className="w-full flex items-center justify-center px-4 py-3 mt-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer"
              >
                {localLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : mode === 'login' ? (
                  <LogIn className="h-4 w-4 mr-2" />
                ) : mode === 'register' ? (
                  <UserPlus className="h-4 w-4 mr-2" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {mode === 'login' && 'Sign In to MaintainIQ'}
                {mode === 'register' && 'Register Account'}
                {mode === 'forgot' && 'Send Code via SMTP Email'}
                {mode === 'reset' && 'Confirm Code & Reset'}
              </button>
            </form>

            <div className="flex justify-between items-center mt-6">
              {mode !== 'login' ? (
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition cursor-pointer underline"
                >
                  Create a standard user account
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
