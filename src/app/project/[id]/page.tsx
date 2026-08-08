'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Download, Trash2, Edit3, RefreshCw, Eye, Search, Filter,
  BookOpen, Layers, CheckCircle2, XCircle, Info, Sparkles, Save, X
} from 'lucide-react';

export default function ProjectDetails({ params }: { params: { id: string } }) {
  const { id } = params;
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');

  // Export options
  const [exportOption, setExportOption] = useState<'questionsOnly' | 'questionsAnswers' | 'all'>('all');

  // Inline editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<any>({
    question: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctAnswer: 'A',
    explanation: '',
    type: 'CONCEPTUAL',
    difficulty: 'MEDIUM',
  });

  // Individual card action loading states
  const [regeneratingIds, setRegeneratingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  const fetchProjectData = async () => {
    setLoading(true);
    try {
      // Get project details
      const projectRes = await fetch(`/api/projects/${id}`);
      if (!projectRes.ok) throw new Error('Project not found.');
      const projectData = await projectRes.json();
      setProject(projectData.project);

      // Get questions list
      await fetchQuestions();
    } catch (err: any) {
      setError(err.message || 'Failed to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const res = await fetch(`/api/questions?projectId=${id}`);
      if (!res.ok) throw new Error('Failed to load questions.');
      const data = await res.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      const res = await fetch(`/api/questions/${qId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setQuestions(prev => prev.filter(q => q.id !== qId));
      
      // Update local project question count
      setProject((prev: any) => ({
        ...prev,
        totalQuestions: prev.totalQuestions - 1,
      }));
    } catch (err) {
      alert('Delete failed.');
    }
  };

  const handleRegenerateQuestion = async (qId: string) => {
    setRegeneratingIds(prev => ({ ...prev, [qId]: true }));
    try {
      const res = await fetch(`/api/questions/${qId}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Regeneration failed.');

      // Update question list
      setQuestions(prev => prev.map(q => q.id === qId ? data.question : q));
    } catch (err: any) {
      alert(err.message || 'Regeneration failed.');
    } finally {
      setRegeneratingIds(prev => ({ ...prev, [qId]: false }));
    }
  };

  const startEditing = (q: any) => {
    setEditingQuestionId(q.id);
    setEditFields({
      question: q.question,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      type: q.type,
      difficulty: q.difficulty,
    });
  };

  const handleSaveEdit = async (qId: string) => {
    try {
      const res = await fetch(`/api/questions/${qId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFields),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');

      setQuestions(prev => prev.map(q => q.id === qId ? data.question : q));
      setEditingQuestionId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to save edits.');
    }
  };

  const handleDownloadDocx = () => {
    window.open(`/api/export/docx?projectId=${id}&option=${exportOption}`);
  };

  // Client side filtering
  const filteredQuestions = questions.filter(q => {
    const matchesSearch =
      q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.optionA.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.optionB.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.optionC.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.optionD.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.explanation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = selectedType === 'ALL' || q.type === selectedType;
    const matchesDifficulty = selectedDifficulty === 'ALL' || q.difficulty === selectedDifficulty;

    return matchesSearch && matchesType && matchesDifficulty;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center space-y-3 flex-col">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
        <span className="text-sm text-gray-400">Loading Preview Dashboard...</span>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <XCircle className="w-12 h-12 text-red-500" />
        <div>
          <h2 className="text-xl font-bold text-gray-200">Error Loading Project</h2>
          <p className="text-sm text-gray-500">{error || 'Project not found.'}</p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="px-4 py-2 bg-gray-900 border border-white/5 rounded-xl hover:bg-gray-800 text-xs font-semibold text-gray-300 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col text-left">
      {/* Detail Navbar Header */}
      <header className="border-b border-white/5 bg-gray-950/40 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="p-2.5 rounded-xl bg-gray-900 border border-white/5 text-gray-400 hover:text-white transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">
              {project.subject} • {project.language}
            </span>
            <h1 className="font-bold text-lg text-gray-100 max-w-md truncate">
              {project.chapterName}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export option radio buttons */}
          <div className="bg-gray-900/60 border border-white/5 rounded-xl p-1 flex">
            <button
              onClick={() => setExportOption('questionsOnly')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                exportOption === 'questionsOnly' ? 'bg-violet-600 text-white' : 'text-gray-400'
              }`}
            >
              Q Only
            </button>
            <button
              onClick={() => setExportOption('questionsAnswers')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                exportOption === 'questionsAnswers' ? 'bg-violet-600 text-white' : 'text-gray-400'
              }`}
            >
              Q + A
            </button>
            <button
              onClick={() => setExportOption('all')}
              className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                exportOption === 'all' ? 'bg-violet-600 text-white' : 'text-gray-400'
              }`}
            >
              Q + A + Exp
            </button>
          </div>

          <button
            onClick={handleDownloadDocx}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-violet-600/15"
          >
            <Download className="w-4 h-4" /> Download DOCX
          </button>
        </div>
      </header>

      {/* Main content view */}
      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Filter Panels */}
        <div className="md:col-span-3 space-y-6 md:sticky md:top-24">
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-bold text-sm text-gray-200 border-b border-white/5 pb-2 uppercase tracking-widest text-[10px]">
              Filters & Search
            </h3>

            {/* Search inputs */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Search Questions</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Keyword search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-900 border border-white/5 pl-9 pr-4 py-2 rounded-xl text-xs text-white placeholder-gray-600 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            {/* Filter Category */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Category type</label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-gray-900 border border-white/5 pl-9 pr-4 py-2 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="ALL">All Categories</option>
                  <option value="NUMERICAL">NUMERICAL</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="CONCEPTUAL">CONCEPTUAL</option>
                  <option value="STIMULUS">STIMULUS</option>
                  <option value="EQUATION">EQUATION</option>
                  <option value="DIAGRAM">DIAGRAM</option>
                </select>
              </div>
            </div>

            {/* Filter Difficulty */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Difficulty level</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
                <select
                  value={selectedDifficulty}
                  onChange={(e) => setSelectedDifficulty(e.target.value)}
                  className="w-full bg-gray-900 border border-white/5 pl-9 pr-4 py-2 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-violet-500"
                >
                  <option value="ALL">All Difficulties</option>
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats summary */}
          <div className="glass-panel p-6 rounded-2xl text-xs text-gray-400 space-y-3">
            <h4 className="font-bold text-[10px] uppercase text-gray-500 border-b border-white/5 pb-2 tracking-widest">
              Set Statistics
            </h4>
            <div className="flex justify-between">
              <span>Total Questions:</span>
              <span className="font-bold text-gray-200">{project.totalQuestions}</span>
            </div>
            <div className="flex justify-between">
              <span>Matching Filter:</span>
              <span className="font-bold text-violet-400">{filteredQuestions.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Source File:</span>
              <span className="font-medium text-gray-300 truncate max-w-[120px]">{project.document.fileName}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Questions lists preview */}
        <div className="md:col-span-9 space-y-6">
          {project.warningLog && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-2xl flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Note on Generated Ratios:</span>
                <span className="text-[11px] leading-relaxed block">{project.warningLog}</span>
              </div>
            </div>
          )}

          {filteredQuestions.length === 0 ? (
            <div className="glass-panel p-16 rounded-3xl text-center text-gray-500 space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-gray-700 animate-pulse" />
              <p className="font-medium">No matching questions found.</p>
              <p className="text-xs text-gray-600">Try adjusting your filters or search keyword.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredQuestions.map((q, idx) => (
                <div key={q.id} className="glass-card p-6 rounded-2xl space-y-4 relative text-left">
                  
                  {editingQuestionId === q.id ? (
                    // Edit Question panel inside card
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="font-bold text-xs text-violet-400">Edit Question #{idx + 1}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(q.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 text-[10px] font-bold"
                          >
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                          <button
                            onClick={() => setEditingQuestionId(null)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 flex items-center gap-1 text-[10px] font-bold"
                          >
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </div>

                      {/* Question Content Editor */}
                      <div className="space-y-3 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Question Description</label>
                          <textarea
                            value={editFields.question}
                            onChange={(e) => setEditFields({ ...editFields, question: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                            rows={3}
                          />
                        </div>

                        {/* Options grids */}
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Option A</label>
                            <input
                              type="text"
                              value={editFields.optionA}
                              onChange={(e) => setEditFields({ ...editFields, optionA: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Option B</label>
                            <input
                              type="text"
                              value={editFields.optionB}
                              onChange={(e) => setEditFields({ ...editFields, optionB: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Option C</label>
                            <input
                              type="text"
                              value={editFields.optionC}
                              onChange={(e) => setEditFields({ ...editFields, optionC: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Option D</label>
                            <input
                              type="text"
                              value={editFields.optionD}
                              onChange={(e) => setEditFields({ ...editFields, optionD: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                            />
                          </div>
                        </div>

                        {/* Answer and explanations */}
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Correct Choice</label>
                            <select
                              value={editFields.correctAnswer}
                              onChange={(e) => setEditFields({ ...editFields, correctAnswer: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300"
                            >
                              <option value="A">Choice A</option>
                              <option value="B">Choice B</option>
                              <option value="C">Choice C</option>
                              <option value="D">Choice D</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Category Category</label>
                            <select
                              value={editFields.type}
                              onChange={(e) => setEditFields({ ...editFields, type: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300"
                            >
                              <option value="NUMERICAL">NUMERICAL</option>
                              <option value="CRITICAL">CRITICAL</option>
                              <option value="CONCEPTUAL">CONCEPTUAL</option>
                              <option value="STIMULUS">STIMULUS</option>
                              <option value="EQUATION">EQUATION</option>
                              <option value="DIAGRAM">DIAGRAM</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 block mb-1">Difficulty</label>
                            <select
                              value={editFields.difficulty}
                              onChange={(e) => setEditFields({ ...editFields, difficulty: e.target.value })}
                              className="w-full bg-gray-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300"
                            >
                              <option value="EASY">EASY</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HARD">HARD</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Explanation</label>
                          <textarea
                            value={editFields.explanation}
                            onChange={(e) => setEditFields({ ...editFields, explanation: e.target.value })}
                            className="w-full bg-gray-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-violet-500"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Regular MCQ Preview Card
                    <div className="space-y-4">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex gap-2 flex-wrap items-center">
                          <span className="font-bold text-gray-400">#{idx + 1}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded uppercase">
                            {q.type}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${
                            q.difficulty === 'EASY'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : q.difficulty === 'HARD'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {q.difficulty}
                          </span>
                        </div>

                        {/* Top corner action triggers */}
                        <div className="flex gap-1.5 items-center">
                          <button
                            onClick={() => startEditing(q)}
                            className="p-1.5 bg-gray-900 border border-white/5 hover:border-violet-500/35 rounded-lg text-gray-400 hover:text-white transition-all"
                            title="Edit MCQ"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRegenerateQuestion(q.id)}
                            disabled={regeneratingIds[q.id]}
                            className="p-1.5 bg-gray-900 border border-white/5 hover:border-violet-500/35 rounded-lg text-gray-400 hover:text-white transition-all disabled:opacity-40"
                            title="Regenerate single MCQ"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${regeneratingIds[q.id] ? 'animate-spin text-violet-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition-all"
                            title="Delete MCQ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="font-semibold text-gray-200 text-sm leading-relaxed">
                        {q.question}
                      </p>

                      {/* Options Grid */}
                      <div className="grid md:grid-cols-2 gap-3 text-xs">
                        <div className={`p-3 rounded-xl border flex gap-2 ${
                          q.correctAnswer === 'A'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-gray-900/60 border-white/5 text-gray-400'
                        }`}>
                          <span className="font-bold">A.</span>
                          <span>{q.optionA}</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex gap-2 ${
                          q.correctAnswer === 'B'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-gray-900/60 border-white/5 text-gray-400'
                        }`}>
                          <span className="font-bold">B.</span>
                          <span>{q.optionB}</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex gap-2 ${
                          q.correctAnswer === 'C'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-gray-900/60 border-white/5 text-gray-400'
                        }`}>
                          <span className="font-bold">C.</span>
                          <span>{q.optionC}</span>
                        </div>
                        <div className={`p-3 rounded-xl border flex gap-2 ${
                          q.correctAnswer === 'D'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-gray-900/60 border-white/5 text-gray-400'
                        }`}>
                          <span className="font-bold">D.</span>
                          <span>{q.optionD}</span>
                        </div>
                      </div>

                      {/* Answers & Explanations Details */}
                      <div className="bg-gray-900/30 border border-white/5 p-4 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Correct Answer: Choice {q.correctAnswer}
                        </div>
                        <p className="text-gray-400 italic leading-relaxed">
                          <span className="font-bold not-italic text-gray-500">Explanation: </span>
                          {q.explanation}
                        </p>
                      </div>

                      {/* Footer tags (source page & confidence) */}
                      <div className="flex gap-4 text-[10px] text-gray-600 font-medium pt-1">
                        {q.sourcePage && (
                          <span>Source reference: {q.sourcePage}</span>
                        )}
                        <span>AI Confidence: {Math.round(q.confidence * 100)}%</span>
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
