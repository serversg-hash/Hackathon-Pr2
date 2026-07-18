import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, CheckCircle, Clock, Hammer, ShieldAlert, Ban, Info, 
  Sparkles, Send, Loader2, Calendar, MapPin, User, Mail, Tag, ArrowRight, DollarSign
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SafeAsset {
  name: string;
  code: string;
  category: string;
  location: string;
  condition: string;
  status: string;
  lastServiceDate: string;
  nextServiceDate: string;
}

interface SafeHistory {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

interface AITriageResult {
  title: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  possibleCauses: string[];
  initialChecks: string[];
  recurringPatternWarning?: string;
  suggestedByAI?: boolean;
}

async function safeParseResponse(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: text.substring(0, 150) || `Server returned status ${res.status}` };
  }
}

export default function PublicAssetPage({ code }: { code?: string }) {
  const { user } = useAuth();
  const getAssetCodeFromPath = () => {
    const parts = window.location.pathname.split('/');
    // Handle /assets/public/CODE or /assets/public/CODE/
    const lastPart = parts[parts.length - 1] === '' ? parts[parts.length - 2] : parts[parts.length - 1];
    return lastPart || '';
  };

  const assetCode = code || getAssetCodeFromPath();
  const [asset, setAsset] = useState<SafeAsset | null>(null);
  const [history, setHistory] = useState<SafeHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Issue Reporting Form States
  const [complaint, setComplaint] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');
  const [budget, setBudget] = useState('');
  const [isTriageLoading, setIsTriageLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<AITriageResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Editable Form Fields (filled by AI Triage or manually)
  const [issueTitle, setIssueTitle] = useState('');
  const [issueCategory, setIssueCategory] = useState('');
  const [issuePriority, setIssuePriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');

  useEffect(() => {
    if (user) {
      setReporterName(user.name || '');
      setReporterEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    fetchAssetData();
  }, [assetCode]);

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/v1/assets/public/${assetCode}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(`Asset with code "${assetCode}" was not found or is inactive.`);
        }
        throw new Error('Failed to load asset details.');
      }
      const data = await res.json();
      setAsset(data.asset);
      setHistory(data.history);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAITriage = async () => {
    if (!complaint.trim()) return;
    try {
      setIsTriageLoading(true);
      const res = await fetch('/api/v1/issues/public/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          complaint,
          assetName: asset?.name,
          assetCategory: asset?.category,
          assetCondition: asset?.condition,
          assetLocation: asset?.location,
        })
      });
      const result = await res.json();
      if (result.success && result.data) {
        setTriageResult(result.data);
        setIssueTitle(result.data.title);
        setIssueCategory(result.data.category);
        setIssuePriority(result.data.priority);
      }
    } catch (err) {
      console.error('Error during AI Triage:', err);
    } finally {
      setIsTriageLoading(false);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset || !issueTitle || !complaint || !reporterName || !reporterEmail) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/v1/issues/public/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetCode: asset.code,
          title: issueTitle,
          description: complaint,
          priority: issuePriority,
          category: issueCategory,
          reporterName,
          reporterEmail,
          isAISuggested: !!triageResult?.suggestedByAI,
          isUserEdited: triageResult ? (issueTitle !== triageResult.title || issueCategory !== triageResult.category || issuePriority !== triageResult.priority) : false,
          budget: budget ? Number(budget) : 0,
        })
      });

      if (!res.ok) {
        const data = await safeParseResponse(res);
        throw new Error(data.error || 'Failed to submit report');
      }

      setSubmitSuccess(true);
      // Re-fetch updated asset details/history
      fetchAssetData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Operational':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle className="w-3.5 h-3.5 mr-1" /> Operational</span>;
      case 'Issue Reported':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertTriangle className="w-3.5 h-3.5 mr-1" /> Issue Reported</span>;
      case 'Under Inspection':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Clock className="w-3.5 h-3.5 mr-1" /> Under Inspection</span>;
      case 'Under Maintenance':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Hammer className="w-3.5 h-3.5 mr-1" /> Under Maintenance</span>;
      case 'Out of Service':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><ShieldAlert className="w-3.5 h-3.5 mr-1" /> Out of Service</span>;
      case 'Retired':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 text-slate-700"><Ban className="w-3.5 h-3.5 mr-1" /> Retired</span>;
      default:
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'High': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Medium': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <p className="mt-4 text-slate-400 font-medium">Retrieving digital asset passport...</p>
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ban className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Asset Record Not Found</h2>
          <p className="mt-2 text-slate-600 text-sm leading-relaxed">{error || 'Asset not found.'}</p>
          <p className="mt-4 text-xs text-slate-400 font-mono">CODE EXCEPTION: ERR_ASSET_404</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Passport */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="font-mono text-xs font-semibold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">Digital Asset ID</span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{asset.name}</h1>
              <p className="mt-1 font-mono text-sm text-slate-500 font-medium">{asset.code}</p>
            </div>
            <div className="self-start sm:self-center">
              {getStatusBadge(asset.status)}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 border-t border-slate-100 pt-6">
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</span>
              <span className="mt-1 flex items-center text-sm font-medium text-slate-700">
                <Tag className="w-4 h-4 mr-1 text-slate-400" />
                {asset.category}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</span>
              <span className="mt-1 flex items-center text-sm font-medium text-slate-700">
                <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                {asset.location}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Last Serviced</span>
              <span className="mt-1 flex items-center text-sm font-medium text-slate-700">
                <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                {new Date(asset.lastServiceDate).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Service Due</span>
              <span className="mt-1 flex items-center text-sm font-medium text-slate-700">
                <Calendar className="w-4 h-4 mr-1 text-slate-400" />
                {new Date(asset.nextServiceDate).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Action Grid: Form + Activity Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          
          {/* Left Column: Reporting Issue Form */}
          <div className="md:col-span-3 bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100">
            <h2 className="text-xl font-bold text-slate-950 flex items-center mb-6">
              <AlertTriangle className="w-5 h-5 mr-2 text-blue-600" />
              Report an Issue
            </h2>

            {submitSuccess ? (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Issue Submitted Safely</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Thank you for reporting this issue. A technician has been alerted and will inspect the asset shortly. You can monitor the status directly from this public passport page.
                </p>
                <button 
                  onClick={() => {
                    setSubmitSuccess(false);
                    setComplaint('');
                    setTriageResult(null);
                  }}
                  className="mt-5 inline-flex items-center px-4 py-2 text-sm font-medium text-emerald-800 bg-emerald-100 rounded-xl hover:bg-emerald-200 transition cursor-pointer"
                >
                  Report Another Issue
                </button>
              </div>
            ) : asset.status === 'Retired' ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <Ban className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Asset Retired</h3>
                <p className="mt-2 text-sm text-slate-600">
                  This asset is retired. Issue reports and service requests are permanently disabled for this profile.
                </p>
              </div>
            ) : !user ? (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 text-center">
                <ShieldAlert className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-slate-900">Authentication Required</h3>
                <p className="mt-2 text-sm text-slate-600">
                  You must be logged in to submit a maintenance report for this asset. Please log in to proceed.
                </p>
                <button 
                  onClick={() => window.location.href = '/'}
                  className="mt-5 inline-flex items-center px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition cursor-pointer"
                >
                  Log In to Report
                </button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-6">
                
                {/* Step 1: Natural Language Complaint */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Describe the Problem (Natural Language)
                  </label>
                  <textarea
                    value={complaint}
                    onChange={(e) => setComplaint(e.target.value)}
                    placeholder="e.g. The classroom projector display is flickering repeatedly and does not detect the HDMI cable when plugged in."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-800"
                    required
                  />
                  <p className="mt-1.5 text-xs text-slate-400">Describe the symptoms cleanly to run smart AI diagnosis.</p>
                </div>

                {/* Proposed Budget */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Proposed Maintenance Budget ($)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold">$</span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
                      min="0"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Optional. Enter your approved or expected budget for the repairs.</p>
                </div>

                {/* AI Triage Trigger */}
                <div className="flex justify-between items-center bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-start">
                    <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 mr-2 animate-bounce" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">AI Issue Triage</h4>
                      <p className="text-[11px] text-slate-500">Auto-fill professional titles, priority, & safety checks.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAITriage}
                    disabled={isTriageLoading || !complaint.trim()}
                    className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 rounded-xl transition cursor-pointer"
                  >
                    {isTriageLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                        Diagnosing...
                      </>
                    ) : (
                      'Triage Complaint'
                    )}
                  </button>
                </div>

                {/* Step 2: Diagnosed / Triage Results */}
                {(triageResult || issueTitle) && (
                  <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/60 space-y-4 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-bold text-purple-700 uppercase tracking-widest flex items-center">
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Triage Assessment Summary
                      </h3>
                      {triageResult?.suggestedByAI && (
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-100 px-2 py-0.5 rounded">AI Assessed</span>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Suggested Title</label>
                        <input
                          type="text"
                          value={issueTitle}
                          onChange={(e) => setIssueTitle(e.target.value)}
                          className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 font-semibold"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</label>
                          <input
                            type="text"
                            value={issueCategory}
                            onChange={(e) => setIssueCategory(e.target.value)}
                            className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</label>
                          <select
                            value={issuePriority}
                            onChange={(e) => setIssuePriority(e.target.value as any)}
                            className="mt-1 w-full px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800 font-medium"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>

                      {/* Display Advisory Safety Check Lists */}
                      {triageResult && (
                        <div className="space-y-2 border-t border-slate-200 pt-3">
                          {triageResult.possibleCauses && triageResult.possibleCauses.length > 0 && (
                            <div>
                              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Potential Causes</span>
                              <ul className="mt-1 list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                                {triageResult.possibleCauses.map((cause, idx) => (
                                  <li key={idx}>{cause}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {triageResult.initialChecks && triageResult.initialChecks.length > 0 && (
                            <div>
                              <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center text-amber-700">
                                <Info className="w-3.5 h-3.5 mr-1" />
                                Recommended Safe Initial Checks
                              </span>
                              <ul className="mt-1 list-disc list-inside text-xs text-slate-600 space-y-0.5 pl-1">
                                {triageResult.initialChecks.map((check, idx) => (
                                  <li key={idx} className="leading-relaxed">{check}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {triageResult.recurringPatternWarning && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex items-start">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 mr-1.5 shrink-0" />
                              <span className="text-[11px] text-amber-800 leading-normal">{triageResult.recurringPatternWarning}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Step 3: Reporter Credentials */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Your Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        placeholder="Alice Reporter"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={reporterEmail}
                        onChange={(e) => setReporterEmail(e.target.value)}
                        placeholder="alice@facility.com"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-800"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !issueTitle}
                  className="w-full flex items-center justify-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Submitting report...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      File Official Maintenance Report
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Public Activity Timeline */}
          <div className="md:col-span-2 bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100 self-start">
            <h2 className="text-xl font-bold text-slate-950 flex items-center mb-6">
              <Clock className="w-5 h-5 mr-2 text-slate-500" />
              Public History Log
            </h2>

            {history.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No public activity registered on this asset yet.</p>
            ) : (
              <div className="relative border-l-2 border-slate-100 pl-4 space-y-6">
                {history.map((log, idx) => (
                  <div key={idx} className="relative animate-fadeIn">
                    {/* Tiny circle indicator */}
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
                    
                    <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</span>
                    <h4 className="mt-1 text-sm font-bold text-slate-800">{log.action}</h4>
                    <p className="mt-1 text-xs text-slate-600 leading-relaxed">{log.details}</p>
                    <span className="mt-2 inline-block text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                      Actor: {log.actor}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
