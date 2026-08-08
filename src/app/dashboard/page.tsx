'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Sparkles, LogOut, Plus, History, ShieldAlert,
  UploadCloud, Settings2, ShieldCheck, Download, Trash2, Edit3, Eye,
  HelpCircle, AlertCircle, RefreshCw, Users, Database, DollarSign, BarChart2
} from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'admin'>('create');
  const [user, setUser] = useState<any>(null);
  
  // File upload states
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [documentId, setDocumentId] = useState('');
  const [docMeta, setDocMeta] = useState<any>(null);

  // Settings states
  const [language, setLanguage] = useState('Bangla');
  const [quantity, setQuantity] = useState('100');
  const [customQty, setCustomQty] = useState('');
  
  const [ratios, setRatios] = useState<Record<string, number>>({
    numerical: 50,
    critical: 10,
    conceptual: 10,
    stimulus: 10,
    equation: 10,
    diagram: 10,
  });

  const [difficulty, setDifficulty] = useState<Record<string, number>>({
    easy: 30,
    medium: 50,
    hard: 20,
  });

  // History and Admin states
  const [projects, setProjects] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  // Generation status
  const [generating, setGenerating] = useState(false);
  const [genProjectId, setGenProjectId] = useState('');
  const [genStep, setGenStep] = useState<'idle' | 'analyzing' | 'generating' | 'validating' | 'deduplicating' | 'completed' | 'failed'>('idle');
  const [genProgress, setGenProgress] = useState(0);
  const [genWarning, setGenWarning] = useState<string | null>(null);

  // Input edits for admin
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [adminUserCredits, setAdminUserCredits] = useState<number>(0);
  const [adminUserPlan, setAdminUserPlan] = useState<string>('FREE');
  const [adminUserRole, setAdminUserRole] = useState<string>('USER');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => {
        if (!res.ok) {
          window.location.href = '/';
        }
        return res.json();
      })
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        window.location.href = '/';
      });
  }, []);

  // Fetch projects when tab is history
  useEffect(() => {
    if (activeTab === 'history') {
      fetch('/api/projects')
        .then(res => res.json())
        .then(data => {
          setProjects(data.projects || []);
        });
    }
  }, [activeTab]);

  // Fetch admin stats when tab is admin
  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminData();
    }
  }, [activeTab]);

  const fetchAdminData = () => {
    setLoadingStats(true);
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => {
        setAdminStats(data.stats);
        setAdminUsers(data.users || []);
      })
      .finally(() => setLoadingStats(false));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  };

  // Drag & Drop event handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelected(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = async (selectedFile: File) => {
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx' && ext !== 'doc') {
      setUploadError('Invalid file type. Please upload a PDF or DOCX/DOC file.');
      return;
    }

    setFile(selectedFile);
    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Parsing failed.');
      }

      setDocumentId(data.documentId);
      setDocMeta(data);
    } catch (err: any) {
      setUploadError(err.message || 'Upload processing failed.');
      setFile(null);
    } finally {
      setUploading(false);
    }
  };

  // Ratio Validation
  const totalRatio = Object.values(ratios).reduce((sum, val) => sum + val, 0);
  const totalDifficulty = Object.values(difficulty).reduce((sum, val) => sum + val, 0);

  const getTargetMCQCount = () => {
    if (quantity === 'custom') {
      return parseInt(customQty) || 0;
    }
    return parseInt(quantity);
  };

  const handleGenerate = async () => {
    const qty = getTargetMCQCount();
    if (qty <= 0) {
      alert('Please specify a valid MCQ quantity.');
      return;
    }

    if (totalRatio !== 100) {
      alert('Question ratios must total exactly 100%.');
      return;
    }

    if (totalDifficulty !== 100) {
      alert('Difficulty distribution must total exactly 100%.');
      return;
    }

    if (user.credits < qty) {
      alert(`Insufficient credits. You need ${qty} credits, but you only have ${user.credits}.`);
      return;
    }

    setGenerating(true);
    setGenWarning(null);
    setGenProgress(0);
    setGenStep('analyzing');

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId,
          language,
          totalQuestions: qty,
          distribution: ratios,
          difficultyDist: difficulty,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'MCQ generation failed.');
      }

      setGenProjectId(data.projectId);
      pollGenerationStatus(data.projectId, qty);
    } catch (err: any) {
      alert(err.message || 'Generation request failed.');
      setGenerating(false);
      setGenStep('idle');
    }
  };

  // Poll status
  const pollGenerationStatus = (projectId: string, targetCount: number) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const data = await res.json();

        if (!res.ok) {
          clearInterval(interval);
          setGenStep('failed');
          setGenerating(false);
          return;
        }

        const project = data.project;
        const generated = data.generatedCount;

        // Set steps depending on project metadata updates
        if (project.chapterName === 'Analyzing Chapter...') {
          setGenStep('analyzing');
          setGenProgress(10);
        } else {
          setGenStep('generating');
          const percent = Math.min(95, Math.round((generated / targetCount) * 80) + 10);
          setGenProgress(percent);
        }

        if (project.warningLog) {
          setGenWarning(project.warningLog);
        }

        if (project.status === 'COMPLETED') {
          clearInterval(interval);
          setGenProgress(100);
          setGenStep('completed');
          setGenerating(false);
          // Refresh user credits
          fetch('/api/auth/me')
            .then(r => r.json())
            .then(u => setUser(u.user));
        } else if (project.status === 'FAILED') {
          clearInterval(interval);
          setGenStep('failed');
          setGenerating(false);
        }
      } catch (err) {
        console.error('Error polling status:', err);
      }
    }, 2000);
  };

  const handleRatioChange = (key: string, val: number) => {
    setRatios(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleDifficultyChange = (key: string, val: number) => {
    setDifficulty(prev => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question set?')) return;
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Delete failed.');
    }
  };

  // Admin user edit
  const startEditUser = (u: any) => {
    setEditingUserId(u.id);
    setAdminUserCredits(u.credits);
    setAdminUserPlan(u.plan);
    setAdminUserRole(u.role);
  };

  const saveUserEdits = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: adminUserRole,
          plan: adminUserPlan,
          credits: adminUserCredits,
        }),
      });

      if (!response.ok) throw new Error('Save failed.');

      setEditingUserId(null);
      fetchAdminData();
    } catch (err) {
      alert('Failed to save user adjustments.');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      fetchAdminData();
    } catch (err) {
      alert('Failed to delete user.');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-white/5 bg-gray-950/40 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Elite Academy
            </h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
              AI Question Creator
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex bg-gray-900/60 border border-white/5 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-200 ${
              activeTab === 'create' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Create MCQ Set
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-200 ${
              activeTab === 'history' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            My Generated Sets
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all duration-200 ${
                activeTab === 'admin' ? 'bg-violet-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin Panel
            </button>
          )}
        </nav>

        {/* User Info Block */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-200">{user?.name || 'Loading...'}</p>
            <div className="flex items-center gap-1.5 justify-end">
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-300 uppercase">
                {user?.plan || 'FREE'}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {user?.credits} Credits
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-gray-900 border border-white/5 text-gray-400 hover:text-white transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Navbar Tabs */}
      <div className="md:hidden flex bg-gray-950 border-b border-white/5 p-2 gap-2 justify-center">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'create' ? 'bg-violet-600 text-white' : 'text-gray-400'
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
            activeTab === 'history' ? 'bg-violet-600 text-white' : 'text-gray-400'
          }`}
        >
          My Sets
        </button>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              activeTab === 'admin' ? 'bg-violet-600 text-white' : 'text-gray-400'
            }`}
          >
            Admin
          </button>
        )}
      </div>

      {/* Dashboard Body */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8 overflow-y-auto">

        {/* Tab 1: Create Set */}
        {activeTab === 'create' && (
          <div className="grid md:grid-cols-12 gap-8 items-start">
            
            {/* Left Hand: Upload & Settings */}
            <div className="md:col-span-7 space-y-6">
              
              {/* Drag and Drop Box */}
              <div className="glass-panel p-8 rounded-3xl text-center space-y-4 relative overflow-hidden">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                />

                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-300 flex flex-col items-center justify-center space-y-4 ${
                    dragActive
                      ? 'border-violet-500 bg-violet-500/5'
                      : file
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/10 hover:border-violet-500/50 hover:bg-white/5'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    file ? 'bg-emerald-500/10 text-emerald-400' : 'bg-violet-500/10 text-violet-400'
                  }`}>
                    <UploadCloud className="w-8 h-8" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-200">
                      {file ? file.name : 'Upload Your Chapter'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {file ? 'Click or drag a new file to replace' : 'Drag & Drop your PDF or DOCX/DOC here'}
                    </p>
                  </div>

                  {!file && (
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold bg-white/5 border border-white/10 rounded-xl text-gray-200 hover:bg-white/10"
                    >
                      Choose File
                    </button>
                  )}
                </div>

                {uploading && (
                  <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 rounded-3xl">
                    <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
                    <span className="text-sm font-medium text-gray-300">Extracting book content...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl flex items-center gap-2 justify-center">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {uploadError}
                  </div>
                )}

                {docMeta && (
                  <div className="grid grid-cols-2 gap-4 text-left border-t border-white/5 pt-6 text-xs text-gray-400">
                    <div>
                      <span className="block font-semibold text-gray-500 uppercase tracking-widest text-[9px] mb-1">File Name</span>
                      <span className="text-gray-300 font-medium truncate block">{docMeta.fileName}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-gray-500 uppercase tracking-widest text-[9px] mb-1">File Size</span>
                      <span className="text-gray-300 font-medium">{docMeta.fileSize}</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-gray-500 uppercase tracking-widest text-[9px] mb-1">Estimated Pages</span>
                      <span className="text-gray-300 font-medium">{docMeta.pages} pages</span>
                    </div>
                    <div>
                      <span className="block font-semibold text-gray-500 uppercase tracking-widest text-[9px] mb-1">Extraction Status</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        SUCCESS
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Configurations Form */}
              <div className="glass-panel p-8 rounded-3xl space-y-6 text-left">
                <h2 className="text-xl font-bold flex items-center gap-2 border-b border-white/5 pb-4">
                  <Settings2 className="w-5 h-5 text-violet-400" />
                  Generation Parameters
                </h2>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Language Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Output Language</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setLanguage('Bangla')}
                        className={`py-2.5 text-center font-medium rounded-xl border text-sm transition-all ${
                          language === 'Bangla'
                            ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                            : 'bg-gray-900 border-white/5 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        বাংলা / Bengali
                      </button>
                      <button
                        onClick={() => setLanguage('English')}
                        className={`py-2.5 text-center font-medium rounded-xl border text-sm transition-all ${
                          language === 'English'
                            ? 'bg-violet-600 border-violet-500 text-white shadow-md'
                            : 'bg-gray-900 border-white/5 text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        English
                      </button>
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">How many MCQs?</label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full bg-gray-900 border border-white/5 py-2.5 px-4 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-violet-500"
                    >
                      <option value="100">100 MCQs (Quick set)</option>
                      <option value="500">500 MCQs</option>
                      <option value="1000">1000 MCQs (Standard test)</option>
                      <option value="2000">2000 MCQs</option>
                      <option value="3000">3000 MCQs (Ultimate Bank)</option>
                      <option value="custom">Custom Number</option>
                    </select>

                    {quantity === 'custom' && (
                      <input
                        type="number"
                        placeholder="Enter quantity (e.g. 250)"
                        value={customQty}
                        onChange={(e) => setCustomQty(e.target.value)}
                        className="w-full bg-gray-900 border border-white/5 py-2 px-4 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 mt-2"
                      />
                    )}
                  </div>
                </div>

                {/* Difficulty Levels Slider */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Difficulty Level Distribution</label>
                    <span className={`text-xs font-bold ${totalDifficulty === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Total: {totalDifficulty}%
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-4">
                    {['easy', 'medium', 'hard'].map(d => (
                      <div key={d} className="bg-gray-900/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-gray-400">
                          <span className="capitalize">{d}</span>
                          <span>{difficulty[d]}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={difficulty[d]}
                          onChange={(e) => handleDifficultyChange(d, parseInt(e.target.value))}
                          className="w-full accent-violet-500 h-1 rounded-lg bg-gray-800 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>
                  {totalDifficulty !== 100 && (
                    <p className="text-[10px] text-red-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Difficulty values must add up to exactly 100%.
                    </p>
                  )}
                </div>

                {/* Question Type Ratio sliders */}
                <div className="space-y-4 border-t border-white/5 pt-6">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Smart Question-Type Ratio</label>
                    <span className={`text-xs font-bold ${totalRatio === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                      Total Ratio: {totalRatio}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(ratios).map(([key, val]) => (
                      <div key={key} className="bg-gray-900/60 p-3 rounded-xl border border-white/5 space-y-1.5">
                        <div className="flex justify-between text-xs font-medium text-gray-400">
                          <span className="capitalize">{key === 'numerical' ? 'Numerical' : key === 'critical' ? 'Critical' : key === 'conceptual' ? 'Conceptual' : key === 'stimulus' ? 'Stimulus' : key === 'equation' ? 'Equation' : 'Diagram'}</span>
                          <span>{val}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={val}
                          onChange={(e) => handleRatioChange(key, parseInt(e.target.value))}
                          className="w-full accent-violet-500 h-1 rounded-lg bg-gray-800 cursor-pointer"
                        />
                      </div>
                    ))}
                  </div>

                  {totalRatio !== 100 ? (
                    <p className="text-[10px] text-red-400 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Question distribution must total 100%.
                    </p>
                  ) : (
                    <p className="text-[10px] text-gray-500 italic">
                      Note: Subject-Aware generation will redistribute Diagram or Equation ratios if the document does not contain relevant diagrams or formulas.
                    </p>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!documentId || totalRatio !== 100 || totalDifficulty !== 100 || generating}
                  className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate MCQ Question Bank
                </button>
              </div>

            </div>

            {/* Right Hand: Progress Tracker */}
            <div className="md:col-span-5 space-y-6 sticky top-24">
              <div className="glass-panel p-8 rounded-3xl space-y-6 text-left relative overflow-hidden">
                <h3 className="font-bold text-lg text-gray-200 border-b border-white/5 pb-4">
                  Generation progress
                </h3>

                {generating || genStep !== 'idle' ? (
                  <div className="space-y-6">
                    {/* Steps list */}
                    <div className="space-y-4 text-xs font-medium">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300">Status</span>
                        <span className="text-violet-400 capitalize font-bold">{genStep}</span>
                      </div>

                      <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className="bg-gradient-to-r from-violet-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${genProgress}%` }}
                        />
                      </div>

                      {/* Steps statuses */}
                      <ul className="space-y-3 pt-2 text-xs">
                        <li className={`flex items-center gap-2.5 ${genStep === 'analyzing' ? 'text-violet-400 font-semibold' : genProgress > 10 ? 'text-emerald-400' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${genStep === 'analyzing' ? 'bg-violet-400 animate-ping' : genProgress > 10 ? 'bg-emerald-400' : 'bg-gray-800'}`} />
                          Analyzing Chapter and Subject mappings... {genProgress > 10 ? '100%' : ''}
                        </li>
                        <li className={`flex items-center gap-2.5 ${genStep === 'generating' ? 'text-violet-400 font-semibold' : genProgress > 80 ? 'text-emerald-400' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${genStep === 'generating' ? 'bg-violet-400 animate-ping' : genProgress > 80 ? 'bg-emerald-400' : 'bg-gray-800'}`} />
                          Generating MCQ batches... {genProgress > 80 ? '100%' : ''}
                        </li>
                        <li className={`flex items-center gap-2.5 ${genStep === 'validating' ? 'text-violet-400 font-semibold' : genProgress > 90 ? 'text-emerald-400' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${genStep === 'validating' ? 'bg-violet-400 animate-ping' : genProgress > 90 ? 'bg-emerald-400' : 'bg-gray-800'}`} />
                          Validating questions and correct answers QA...
                        </li>
                        <li className={`flex items-center gap-2.5 ${genStep === 'deduplicating' ? 'text-violet-400 font-semibold' : genProgress === 100 ? 'text-emerald-400' : 'text-gray-600'}`}>
                          <div className={`w-2 h-2 rounded-full ${genStep === 'deduplicating' ? 'bg-violet-400 animate-ping' : genProgress === 100 ? 'bg-emerald-400' : 'bg-gray-800'}`} />
                          Removing duplicate questions (Jaccard filters)...
                        </li>
                      </ul>
                    </div>

                    {genWarning && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block mb-0.5">Ratio redistribution warning:</span>
                          <span className="text-[11px] leading-relaxed block">{genWarning}</span>
                        </div>
                      </div>
                    )}

                    {genStep === 'completed' && (
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-center space-y-1">
                          <span className="font-bold block text-sm">Your Question Bank is Ready!</span>
                          <span className="text-xs">Generated set matches requested standards.</span>
                        </div>
                        <button
                          onClick={() => window.location.href = `/project/${genProjectId}`}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/15"
                        >
                          <Eye className="w-4 h-4" />
                          Open Question Preview Board
                        </button>
                      </div>
                    )}

                    {genStep === 'failed' && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-xl text-center">
                        <span className="font-bold block text-sm">Generation Failed</span>
                        <span className="text-xs">LLM limits or network timeout error occurred. Please try again.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 space-y-3">
                    <HelpCircle className="w-10 h-10 mx-auto text-gray-700" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Ready for generation</p>
                      <p className="text-xs text-gray-600 max-w-[240px] mx-auto leading-relaxed">
                        Select a textbook file on the left, adjust parameters, and click "Generate".
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: My Sets (History) */}
        {activeTab === 'history' && (
          <div className="space-y-6 text-left">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Generated Sets</h2>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-medium text-xs flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Create New Set
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="glass-panel p-16 rounded-3xl text-center space-y-4 text-gray-500">
                <History className="w-12 h-12 mx-auto text-gray-700 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-bold text-gray-400">No question sets found</p>
                  <p className="text-xs text-gray-600">You haven't generated any MCQ question banks yet.</p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {projects.map((project) => (
                  <div key={project.id} className="glass-card p-6 rounded-2xl space-y-4 relative">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 max-w-[75%]">
                        <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">
                          {project.subject}
                        </span>
                        <h3 className="font-bold text-lg text-gray-200 truncate block">
                          {project.chapterName}
                        </h3>
                        <p className="text-xs text-gray-500 truncate block">
                          Source: {project.document.fileName}
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        project.status === 'COMPLETED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : project.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {project.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 border-t border-b border-white/5 py-4 text-xs text-gray-400">
                      <div>
                        <span className="block text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">MCQ Count</span>
                        <span className="text-gray-300 font-semibold">{project.totalQuestions} Questions</span>
                      </div>
                      <div>
                        <span className="block text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Language</span>
                        <span className="text-gray-300 font-semibold">{project.language}</span>
                      </div>
                      <div>
                        <span className="block text-gray-600 text-[10px] uppercase tracking-wider mb-0.5">Created Date</span>
                        <span className="text-gray-300 font-semibold">{new Date(project.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => window.location.href = `/project/${project.id}`}
                        className="px-3.5 py-2 text-xs font-semibold bg-gray-900 border border-white/5 rounded-xl hover:bg-gray-850 hover:text-white text-gray-300 flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> View / Edit
                      </button>
                      <a
                        href={`/api/export/docx?projectId=${project.id}`}
                        className="px-3.5 py-2 text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white rounded-xl flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Word/DOCX
                      </a>
                      <button
                        onClick={() => handleDeleteProject(project.id)}
                        className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition-all duration-150"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Admin Panel */}
        {activeTab === 'admin' && user?.role === 'ADMIN' && (
          <div className="space-y-8 text-left">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-violet-400" />
              Administrative Overview
            </h2>

            {/* Metrics cards */}
            {adminStats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                
                {/* Users Count */}
                <div className="glass-panel p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs uppercase tracking-wider font-semibold">Total Users</span>
                    <Users className="w-4 h-4 text-violet-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold tracking-tight text-white">{adminStats.totalUsers}</span>
                    <span className="block text-[10px] text-gray-500">Active users: {adminStats.activeUsers}</span>
                  </div>
                </div>

                {/* Generated MCQs */}
                <div className="glass-panel p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs uppercase tracking-wider font-semibold">Generated MCQs</span>
                    <BarChart2 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold tracking-tight text-white">{adminStats.totalMCQs}</span>
                    <span className="block text-[10px] text-gray-500">Daily total: {adminStats.dailyMCQs}</span>
                  </div>
                </div>

                {/* Total API Cost */}
                <div className="glass-panel p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs uppercase tracking-wider font-semibold">AI Cost (Est)</span>
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold tracking-tight text-white">${adminStats.apiCost}</span>
                    <span className="block text-[10px] text-gray-500">Failed jobs: {adminStats.failedGenerations}</span>
                  </div>
                </div>

                {/* Storage usage */}
                <div className="glass-panel p-5 rounded-2xl space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs uppercase tracking-wider font-semibold">Storage Usage</span>
                    <Database className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-3xl font-extrabold tracking-tight text-white">{adminStats.storageUsage}</span>
                    <span className="block text-[10px] text-gray-500">Total book uploads: {adminStats.totalFiles}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="h-20 flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-violet-500 animate-spin" />
              </div>
            )}

            {/* Users Account Management Table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gray-900/30">
                <h3 className="font-bold text-gray-200">Registered Accounts</h3>
                <button
                  onClick={fetchAdminData}
                  className="p-2 bg-gray-900 border border-white/5 rounded-xl hover:bg-gray-800 text-gray-400 hover:text-white transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-900/50 text-gray-400 uppercase tracking-widest font-semibold border-b border-white/5">
                      <th className="p-4">Name</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Plan</th>
                      <th className="p-4">Credits</th>
                      <th className="p-4">Created Date</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-all text-gray-300">
                        <td className="p-4 font-semibold text-gray-200">{u.name}</td>
                        <td className="p-4">{u.email}</td>
                        <td className="p-4">
                          {editingUserId === u.id ? (
                            <select
                              value={adminUserRole}
                              onChange={(e) => setAdminUserRole(e.target.value)}
                              className="bg-gray-950 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="USER">USER</option>
                              <option value="ADMIN">ADMIN</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.role === 'ADMIN' ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-gray-800 text-gray-400'
                            }`}>
                              {u.role}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingUserId === u.id ? (
                            <select
                              value={adminUserPlan}
                              onChange={(e) => setAdminUserPlan(e.target.value)}
                              className="bg-gray-950 border border-white/10 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="FREE">FREE</option>
                              <option value="PREMIUM">PREMIUM</option>
                              <option value="ENTERPRISE">ENTERPRISE</option>
                            </select>
                          ) : (
                            <span className="font-semibold text-violet-300">{u.plan}</span>
                          )}
                        </td>
                        <td className="p-4">
                          {editingUserId === u.id ? (
                            <input
                              type="number"
                              value={adminUserCredits}
                              onChange={(e) => setAdminUserCredits(parseInt(e.target.value) || 0)}
                              className="bg-gray-950 border border-white/10 rounded px-2 py-1 text-xs text-white w-20"
                            />
                          ) : (
                            <span className="font-bold">{u.credits}</span>
                          )}
                        </td>
                        <td className="p-4 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td className="p-4 text-right">
                          {editingUserId === u.id ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => saveUserEdits(u.id)}
                                className="px-2 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-500"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-2 py-1 bg-gray-800 text-gray-300 rounded font-medium hover:bg-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 justify-end items-center">
                              <button
                                onClick={() => startEditUser(u)}
                                className="p-1.5 bg-gray-900 border border-white/5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="p-1.5 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
