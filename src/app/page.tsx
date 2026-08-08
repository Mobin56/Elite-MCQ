'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, GraduationCap, ArrowRight, Lock, Mail, User } from 'lucide-react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('user@eliteacademy.com');
  const [password, setPassword] = useState('userpassword');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill demo credentials
  const selectCreds = (type: 'user' | 'admin') => {
    if (type === 'user') {
      setEmail('user@eliteacademy.com');
      setPassword('userpassword');
    } else {
      setEmail('admin@eliteacademy.com');
      setPassword('adminpassword');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Request failed.');
      }

      // Success, go to dashboard
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">
      {/* Dynamic backgrounds */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-6xl grid md:grid-cols-12 gap-8 items-center z-10">
        
        {/* Left Side: Info & Brand */}
        <div className="md:col-span-7 space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm font-medium">
            <Sparkles className="w-4 h-4 text-violet-400" />
            AI-Powered Question Bank Platform
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
              Elite Academy
            </h1>
          </div>

          <h2 className="text-2xl md:text-3xl font-semibold text-gray-200">
            Smart MCQ Generator Portal
          </h2>

          <p className="text-gray-400 max-w-lg leading-relaxed">
            Upload educational book chapters or textbooks in PDF or DOCX format. Our advanced AI identifies marked content, formulas, key definitions, and generates high-quality, exam-standard MCQ question banks with explanations instantly.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md pt-4">
            <div className="p-4 rounded-xl bg-gray-900/40 border border-white/5 space-y-1">
              <h4 className="font-semibold text-violet-300 text-lg">Batch Processing</h4>
              <p className="text-xs text-gray-500">Generate up to 3000+ MCQs divided into efficient batches.</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/40 border border-white/5 space-y-1">
              <h4 className="font-semibold text-cyan-300 text-lg">Smart Ratios</h4>
              <p className="text-xs text-gray-500">Specify precise ratios of numerical, equations, stimulus or critical questions.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form */}
        <div className="md:col-span-5 w-full">
          <div className="glass-panel p-8 rounded-3xl shadow-2xl relative overflow-hidden">
            {/* Tabs */}
            <div className="flex bg-gray-900/80 p-1.5 rounded-xl border border-white/5 mb-6">
              <button
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`flex-1 py-2 text-center rounded-lg font-medium text-sm transition-all duration-200 ${
                  isLogin ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`flex-1 py-2 text-center rounded-lg font-medium text-sm transition-all duration-200 ${
                  !isLogin ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5 text-left">
                  <label className="text-xs font-semibold text-gray-400">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      required
                      className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all duration-200"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="text-xs font-semibold text-gray-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-gray-400">Password</label>
                  {isLogin && (
                    <a href="#" className="text-[10px] text-violet-400 hover:underline">Forgot password?</a>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gray-900/60 border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Seed logins quick selector */}
            <div className="mt-6 pt-6 border-t border-white/5 text-center space-y-2">
              <span className="text-xs text-gray-500">Quick Seed Accounts for Testing:</span>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => selectCreds('user')}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[11px] text-gray-300 transition-all duration-150"
                >
                  Demo User
                </button>
                <button
                  onClick={() => selectCreds('admin')}
                  className="px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-[11px] text-violet-300 transition-all duration-150"
                >
                  Admin User
                </button>
              </div>
              <p className="text-[10px] text-gray-600 leading-tight">
                Passwords: userpassword / adminpassword
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
