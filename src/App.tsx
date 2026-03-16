/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Send, 
  BarChart3, 
  History, 
  ShieldAlert, 
  CheckCircle2, 
  LogOut, 
  LogIn,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Info
} from 'lucide-react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp 
} from './firebase';
import { analyzeTone, AnalysisResult } from './services/gemini';
import Markdown from 'react-markdown';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

// Types
interface AnalysisRecord extends AnalysisResult {
  id: string;
  originalText: string;
  createdAt: any;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'analyze' | 'history' | 'dashboard'>('analyze');
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
  const [teamSentiment, setTeamSentiment] = useState<any[]>([]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // History Listener
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'analyses'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AnalysisRecord[];
      setHistory(docs);
    }, (err) => {
      console.error("Firestore error:", err);
    });

    return () => unsubscribe();
  }, [user]);

  // Team Sentiment Listener
  useEffect(() => {
    const q = query(
      collection(db, 'team_sentiment'),
      orderBy('date', 'asc'),
      limit(30)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          date: docData.date,
          ...docData.averageScores
        };
      });
      setTeamSentiment(data);
    }, (err) => {
      console.error("Sentiment fetch error:", err);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Failed to sign in. Please try again.");
    }
  };

  const handleLogout = () => signOut(auth);

  const handleAnalyze = async () => {
    if (!inputText.trim() || analyzing) return;

    setAnalyzing(true);
    setError(null);
    setCurrentResult(null);

    try {
      const result = await analyzeTone(inputText);
      setCurrentResult(result);

      // Save to Firestore
      if (user) {
        await addDoc(collection(db, 'analyses'), {
          userId: user.uid,
          originalText: inputText,
          suggestedText: result.suggestedText,
          toneScores: result.toneScores,
          explanation: result.explanation,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      setError("Analysis failed. The AI might be busy or the text was too complex.");
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-[#141414] font-mono text-sm"
        >
          INITIALIZING NUANCE...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#E4E3E0] flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tighter text-[#141414] italic font-serif">Nuance</h1>
            <p className="text-sm font-mono text-[#141414]/60 uppercase tracking-widest">The Emotional Intelligence Layer</p>
          </div>
          
          <div className="p-8 border border-[#141414] bg-white shadow-[8px_8px_0px_0px_rgba(20,20,20,1)]">
            <p className="text-sm text-left mb-8 leading-relaxed">
              Remote communication is hard. Nuance uses advanced AI to analyze the emotional subtext of your messages, helping you avoid conflict and build stronger team relationships.
            </p>
            <button 
              onClick={handleLogin}
              className="w-full flex items-center justify-center gap-3 bg-[#141414] text-white py-4 px-6 hover:bg-[#141414]/90 transition-colors font-mono uppercase text-xs tracking-widest"
            >
              <LogIn size={16} />
              Sign in with Google
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-white">
      {/* Header */}
      <header className="border-b border-[#141414] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#E4E3E0]/80 backdrop-blur-sm z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold italic font-serif tracking-tight">Nuance</h1>
          <nav className="hidden md:flex items-center gap-1 ml-8">
            {[
              { id: 'analyze', icon: MessageSquare, label: 'Analyze' },
              { id: 'history', icon: History, label: 'History' },
              { id: 'dashboard', icon: BarChart3, label: 'Dashboard' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-[10px] uppercase tracking-widest font-mono transition-colors flex items-center gap-2 ${
                  activeTab === tab.id ? 'bg-[#141414] text-white' : 'hover:bg-[#141414]/5'
                }`}
              >
                <tab.icon size={12} />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-mono uppercase opacity-50">Authenticated as</p>
            <p className="text-xs font-medium">{user.displayName}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-white transition-all"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'analyze' && (
            <motion.div 
              key="analyze"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Input Section */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Message Input</label>
                  <div className="relative">
                    <textarea 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Paste a message you're about to send or one you just received..."
                      className="w-full h-64 p-6 bg-white border border-[#141414] focus:outline-none focus:ring-0 resize-none text-sm leading-relaxed shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]"
                    />
                    <div className="absolute bottom-4 right-4 text-[10px] font-mono opacity-30">
                      {inputText.length} / 2000
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleAnalyze}
                  disabled={analyzing || !inputText.trim()}
                  className={`w-full py-4 flex items-center justify-center gap-3 font-mono uppercase text-xs tracking-widest transition-all ${
                    analyzing || !inputText.trim() 
                      ? 'bg-[#141414]/10 text-[#141414]/30 cursor-not-allowed' 
                      : 'bg-[#141414] text-white hover:shadow-[6px_6px_0px_0px_rgba(20,20,20,0.3)]'
                  }`}
                >
                  {analyzing ? (
                    <>
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Sparkles size={16} />
                      </motion.div>
                      Analyzing Subtext...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Run Vibe Check
                    </>
                  )}
                </button>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 text-red-600 text-xs flex items-start gap-3">
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              {/* Results Section */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Analysis Results</label>
                  <div className="min-h-[400px] border border-[#141414] bg-white p-6 relative overflow-hidden">
                    {!currentResult && !analyzing && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 opacity-20">
                        <Info size={48} strokeWidth={1} />
                        <p className="mt-4 text-sm font-serif italic">Your analysis will appear here.</p>
                      </div>
                    )}

                    {analyzing && (
                      <div className="space-y-8 animate-pulse">
                        <div className="h-4 bg-[#141414]/5 w-3/4" />
                        <div className="grid grid-cols-2 gap-4">
                          {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 bg-[#141414]/5" />)}
                        </div>
                        <div className="h-32 bg-[#141414]/5" />
                      </div>
                    )}

                    {currentResult && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-8"
                      >
                        {/* Tone Scores */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                          {Object.entries(currentResult.toneScores).map(([tone, score]) => (
                            <div key={tone} className="space-y-1">
                              <div className="flex justify-between items-end">
                                <span className="text-[10px] font-mono uppercase tracking-tighter opacity-70">{tone.replace(/([A-Z])/g, ' $1')}</span>
                                <span className="text-[10px] font-mono">{Math.round(score * 100)}%</span>
                              </div>
                              <div className="h-1 bg-[#141414]/10 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${score * 100}%` }}
                                  className={`h-full ${score > 0.6 ? 'bg-orange-500' : 'bg-[#141414]'}`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Suggested Text */}
                        <div className="space-y-3 pt-6 border-t border-[#141414]/10">
                          <div className="flex items-center gap-2 text-[#141414]">
                            <Sparkles size={14} className="text-orange-500" />
                            <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Nuanced Suggestion</span>
                          </div>
                          <div className="p-4 bg-[#141414]/5 border-l-2 border-[#141414] text-sm italic font-serif leading-relaxed">
                            "{currentResult.suggestedText}"
                          </div>
                          <div className="text-[11px] text-[#141414]/60 leading-relaxed">
                            <span className="font-bold uppercase text-[9px] font-mono block mb-1">Why this works:</span>
                            {currentResult.explanation}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif italic">Communication Archive</h2>
                <p className="text-[10px] font-mono uppercase opacity-50">{history.length} Records Found</p>
              </div>

              <div className="border border-[#141414] bg-white overflow-hidden">
                <div className="grid grid-cols-[1fr_2fr_1fr_40px] p-4 border-b border-[#141414] bg-[#141414] text-white text-[10px] font-mono uppercase tracking-widest">
                  <div>Date</div>
                  <div>Original Message</div>
                  <div>Primary Tone</div>
                  <div />
                </div>
                
                <div className="divide-y divide-[#141414]/10">
                  {history.length === 0 ? (
                    <div className="p-12 text-center text-sm opacity-30 font-serif italic">No history yet. Start analyzing messages to build your archive.</div>
                  ) : (
                    history.map((record) => {
                      const topTone = Object.entries(record.toneScores).sort((a, b) => b[1] - a[1])[0];
                      return (
                        <div 
                          key={record.id} 
                          onClick={() => setSelectedRecord(record)}
                          className="grid grid-cols-[1fr_2fr_1fr_40px] p-4 items-center hover:bg-[#141414]/5 transition-colors cursor-pointer group"
                        >
                          <div className="text-[10px] font-mono opacity-50">
                            {record.createdAt?.toDate().toLocaleDateString()}
                          </div>
                          <div className="text-xs truncate pr-8 font-medium">
                            {record.originalText}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#141414]" />
                            <span className="text-[10px] font-mono uppercase">{topTone[0]} ({Math.round(topTone[1] * 100)}%)</span>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-serif italic">Team Vibe Check</h2>
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-mono uppercase font-bold">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" />
                  Live Sentiment
                </div>
              </div>

              {/* Sentiment Trend Graph */}
              <div className="p-8 border border-[#141414] bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                <h3 className="text-sm font-mono uppercase tracking-widest font-bold mb-8">Historical Sentiment Trend</h3>
                <div className="h-[300px] w-full">
                  {teamSentiment.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={teamSentiment}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#14141410" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#141414" 
                          fontSize={10} 
                          tickFormatter={(val) => val.split('-').slice(1).join('/')}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#141414" 
                          fontSize={10} 
                          domain={[0, 1]} 
                          tickFormatter={(val) => `${Math.round(val * 100)}%`}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#fff', 
                            border: '1px solid #141414',
                            borderRadius: '0px',
                            fontSize: '10px',
                            fontFamily: 'monospace'
                          }}
                        />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', textTransform: 'uppercase' }} />
                        <Line type="monotone" dataKey="empathetic" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="professional" stroke="#141414" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="helpful" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        <Line type="monotone" dataKey="aggressive" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 font-serif italic">
                      <BarChart3 size={48} strokeWidth={1} />
                      <p className="mt-4">Aggregated trend data will appear here as the team uses Nuance.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stat Cards */}
                {[
                  { label: 'Avg Empathy', value: '78%', trend: '+5%', color: 'text-blue-600' },
                  { label: 'Conflict Risk', value: 'Low', trend: '-12%', color: 'text-green-600' },
                  { label: 'Clarity Score', value: '92/100', trend: '+2%', color: 'text-purple-600' }
                ].map((stat, i) => (
                  <div key={i} className="p-6 border border-[#141414] bg-white shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
                    <p className="text-[10px] font-mono uppercase opacity-50 mb-2">{stat.label}</p>
                    <div className="flex items-baseline justify-between">
                      <h3 className={`text-3xl font-bold font-serif ${stat.color}`}>{stat.value}</h3>
                      <span className="text-[10px] font-mono font-bold text-green-600">{stat.trend}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-8 border border-[#141414] bg-white space-y-6">
                  <h3 className="text-sm font-mono uppercase tracking-widest font-bold">Weekly Tone Distribution</h3>
                  <div className="h-64 flex items-end justify-between gap-2 pt-8">
                    {[40, 70, 45, 90, 65, 30, 85].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${h}%` }}
                          className="w-full bg-[#141414] opacity-80 hover:opacity-100 transition-opacity"
                        />
                        <span className="text-[9px] font-mono opacity-40">M T W T F S S"[i]</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-8 border border-[#141414] bg-white space-y-6">
                  <h3 className="text-sm font-mono uppercase tracking-widest font-bold">Recent Team Insights</h3>
                  <div className="space-y-4">
                    {[
                      { icon: ShieldAlert, text: "Urgency levels are peaking on project 'Alpha'. Consider a sync call.", color: "text-orange-600" },
                      { icon: CheckCircle2, text: "Clarity in documentation has improved by 15% this week.", color: "text-green-600" },
                      { icon: Info, text: "Passive-aggressive signals detected in cross-team channels.", color: "text-blue-600" }
                    ].map((insight, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-[#141414]/5 border-l-2 border-[#141414]">
                        <insight.icon size={18} className={insight.color} />
                        <p className="text-xs leading-relaxed">{insight.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-[#141414] p-8 text-center">
        <p className="text-[10px] font-mono uppercase opacity-30 tracking-[0.2em]">
          Nuance AI © 2026 • Built for psychological safety
        </p>
      </footer>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRecord && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="absolute inset-0 bg-[#141414]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#E4E3E0] border border-[#141414] shadow-[12px_12px_0px_0px_rgba(20,20,20,1)] overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-[#141414] flex items-center justify-between bg-white">
                <div className="space-y-1">
                  <h3 className="text-xl font-serif italic">Analysis Detail</h3>
                  <p className="text-[10px] font-mono uppercase opacity-50">
                    {selectedRecord.createdAt?.toDate().toLocaleString()}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-2 hover:bg-[#141414]/5 transition-colors"
                >
                  <AlertCircle size={20} className="rotate-45" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto space-y-8">
                {/* Original Text */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Original Message</label>
                  <div className="p-4 bg-white border border-[#141414]/10 text-sm leading-relaxed">
                    {selectedRecord.originalText}
                  </div>
                </div>

                {/* Tone Scores */}
                <div className="space-y-4">
                  <label className="text-[10px] font-mono uppercase tracking-widest opacity-50">Tone Breakdown</label>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {Object.entries(selectedRecord.toneScores).map(([tone, score]) => (
                      <div key={tone} className="space-y-1">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-mono uppercase tracking-tighter opacity-70">{tone.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-[10px] font-mono">{Math.round(score * 100)}%</span>
                        </div>
                        <div className="h-1 bg-[#141414]/10 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${score * 100}%` }}
                            className={`h-full ${score > 0.6 ? 'bg-orange-500' : 'bg-[#141414]'}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Suggestion & Explanation */}
                <div className="space-y-6 pt-8 border-t border-[#141414]/10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#141414]">
                      <Sparkles size={14} className="text-orange-500" />
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold">Nuanced Suggestion</span>
                    </div>
                    <div className="p-4 bg-white border-l-2 border-[#141414] text-sm italic font-serif leading-relaxed">
                      "{selectedRecord.suggestedText}"
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[#141414]">
                      <Info size={14} className="text-blue-500" />
                      <span className="text-[10px] font-mono uppercase tracking-widest font-bold">AI Explanation</span>
                    </div>
                    <div className="text-sm text-[#141414]/80 leading-relaxed bg-[#141414]/5 p-4 border border-[#141414]/10">
                      {selectedRecord.explanation}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-[#141414] flex justify-end">
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-6 py-2 bg-[#141414] text-white font-mono uppercase text-[10px] tracking-widest hover:bg-[#141414]/90 transition-colors"
                >
                  Close Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
