import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Folder, AlertTriangle, History, LogOut, Plus, 
  Search, Filter, CheckCircle, Clock, Hammer, Ban, ShieldAlert, 
  QrCode, Printer, Download, Trash2, Edit3, ClipboardList, 
  User, Calendar, DollarSign, PenTool, Shield, Tag, MapPin, Loader2, RefreshCw, Send, Sparkles 
} from 'lucide-react';

type TabType = 'analytics' | 'assets' | 'issues' | 'history' | 'users';

interface Asset {
  _id?: string;
  name: string;
  code: string;
  category: string;
  location: string;
  condition: string;
  status: 'Operational' | 'Issue Reported' | 'Under Inspection' | 'Under Maintenance' | 'Out of Service' | 'Retired';
  lastServiceDate: string;
  nextServiceDate: string;
  assignedTechnician?: string;
  createdAt?: string;
}

interface Issue {
  _id?: string;
  issueNumber: string;
  assetCode: string;
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  category: string;
  status: 'Reported' | 'Assigned' | 'Inspection Started' | 'Maintenance In Progress' | 'Waiting for Parts' | 'Resolved' | 'Closed' | 'Reopened';
  reporterName: string;
  reporterEmail: string;
  assignedTechnician?: string;
  maintenanceNotes?: string;
  partsReplaced?: string;
  maintenanceCost?: number;
  createdAt?: string;
  isAISuggested?: boolean;
}

interface HistoryLog {
  _id?: string;
  timestamp: string;
  action: string;
  actor: string;
  assetCode: string;
  issueNumber?: string;
  details?: string;
}

interface SyncedUser {
  _id?: string;
  uid?: string;
  name: string;
  email: string;
  role: 'Admin' | 'Technician' | 'User';
  category?: string;
  isOnline?: boolean;
  createdAt?: string;
}

interface ChatMessage {
  _id?: string;
  issueNumber: string;
  senderEmail: string;
  senderName: string;
  role: 'Admin' | 'Technician' | 'User';
  message: string;
  timestamp: string;
}

async function safeParseResponse(res: Response): Promise<any> {
  const text = await res.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch (err) {
    return { error: text.substring(0, 150) || `Server returned status ${res.status}` };
  }
}

export default function DashboardPage() {
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('analytics');
  
  // Data States
  const [assets, setAssets] = useState<Asset[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [history, setHistory] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Users management states
  const [usersList, setUsersList] = useState<SyncedUser[]>([]);
  const [techniciansList, setTechniciansList] = useState<SyncedUser[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [newTechEmail, setNewTechEmail] = useState('');
  const [newTechName, setNewTechName] = useState('');
  const [newTechPassword, setNewTechPassword] = useState('');
  const [newTechCategory, setNewTechCategory] = useState('General');

  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== 'Admin') return;
    try {
      setIsUsersLoading(true);
      const headers = { 'Authorization': `Bearer ${user.token}` };
      const res = await fetch('/api/v1/users', { headers });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching users list:", err);
    } finally {
      setIsUsersLoading(false);
    }
  }, [user]);

  const fetchTechnicians = useCallback(async () => {
    if (!user) return;
    try {
      const headers = { 'Authorization': `Bearer ${user.token}` };
      const res = await fetch('/api/v1/technicians', { headers });
      if (res.ok) {
        const data = await res.json();
        setTechniciansList(data.technicians || []);
      }
    } catch (err) {
      console.error("Error fetching technicians list:", err);
    }
  }, [user]);

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isImprovingWriting, setIsImprovingWriting] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImproveWriting = async (text: string, context: string, setter: (val: string) => void) => {
    if (!text.trim()) return;
    try {
      setIsImprovingWriting(true);
      const res = await fetch('/api/v1/ai/improve-writing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({ text, context })
      });
      const data = await res.json();
      if (data.improvedText) {
        setter(data.improvedText);
      }
    } catch (err) {
      console.error('Error improving writing:', err);
    } finally {
      setIsImprovingWriting(false);
    }
  };

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newChatMessage, setNewChatMessage] = useState('');

  useEffect(() => {
    if (chatMessages.length > 0) {
      scrollToBottom();
    }
  }, [chatMessages]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      console.log('Fetching data for user:', user.email, 'Token:', user.token);
      const headers = { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' };
      
      const [assetsRes, issuesRes] = await Promise.all([
        fetch('/api/v1/assets', { headers }),
        fetch('/api/v1/issues', { headers })
      ]);

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData.assets || []);
      } else {
        console.error('Fetch assets failed:', await assetsRes.text());
      }
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        setIssues(issuesData.issues || []);
      } else {
        console.error('Fetch issues failed:', await issuesRes.text());
      }

      if (user.role !== 'User') {
        const historyRes = await fetch('/api/v1/history/all', { headers });
        if (historyRes.ok) {
          const histData = await historyRes.json();
          setHistory(histData.history || []);
        }
      }

      if (user.role === 'Admin' && activeTab === 'users') {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, fetchUsers]);

  useEffect(() => {
    if (!authLoading && user) {
      console.log('Dashboard user role:', user.role);
      fetchData();
    }
  }, [authLoading, user, fetchData]);
  const [techIsOnline, setTechIsOnline] = useState(false);
  const [techCategory, setTechCategory] = useState('General');
  const [isTechProfileSaving, setIsTechProfileSaving] = useState(false);
  const [qrInputCode, setQrInputCode] = useState('');

  // Chat states
  // isSendingMessage and chatMessages moved up to fix dependencies

  // Search & Filters
  const [assetSearch, setAssetSearch] = useState('');
  const [assetStatusFilter, setAssetStatusFilter] = useState('');
  const [issueSearch, setIssueSearch] = useState('');
  const [issuePriorityFilter, setIssuePriorityFilter] = useState('');

  // Modals & Forms
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [reportAssetCode, setReportAssetCode] = useState('');
  const [reportTitle, setReportTitle] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportPriority, setReportPriority] = useState('Low');
  const [reportCategory, setReportCategory] = useState('');
  const [showQRLabel, setShowQRLabel] = useState<Asset | null>(null);

  // Add Asset Form State
  const [newAsset, setNewAsset] = useState({
    name: '',
    code: '',
    category: 'Electrical',
    location: '',
    condition: 'Good',
    status: 'Operational' as const,
    lastServiceDate: new Date().toISOString().split('T')[0],
    nextServiceDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    assignedTechnician: '',
  });

  // Update Issue Form State
  const [issueUpdate, setIssueUpdate] = useState({
    status: 'Reported' as const,
    assignedTechnician: '',
    maintenanceNotes: '',
    partsReplaced: '',
    maintenanceCost: 0,
    nextServiceDate: '',
  });

  // Automatically fetch users list and sync profiles
  useEffect(() => {
    if (user) {
      if (user.role === 'User') {
        setActiveTab('issues'); // Default to issues for regular Users
      } else {
        setActiveTab('analytics');
      }
      if (user.role === 'Technician') {
        setTechIsOnline(user.isOnline || false);
        setTechCategory(user.category || 'General');
      }
      fetchData();
      fetchTechnicians();

      // Periodic refresh for technician online status (every 10 seconds)
      const techInterval = setInterval(() => {
        fetchTechnicians();
      }, 10000);

      return () => clearInterval(techInterval);
    }
  }, [user, fetchTechnicians]);

  // Handle periodic fetching for chat messages of selected issue
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (selectedIssue) {
      fetchChatMessages(selectedIssue.issueNumber);
      interval = setInterval(() => {
        fetchChatMessages(selectedIssue.issueNumber);
      }, 3000);
    } else {
      setChatMessages([]);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedIssue]);

  // Keep users list up-to-date if active tab is users
  useEffect(() => {
    if (user && user.role === 'Admin' && activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);


  const handleAddTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || user.role !== 'Admin' || !newTechEmail || !newTechName) return;
    try {
      const res = await fetch('/api/v1/users/technician', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          name: newTechName, 
          email: newTechEmail, 
          password: newTechPassword || undefined,
          category: newTechCategory
        })
      });

      if (res.ok) {
        setNewTechEmail('');
        setNewTechName('');
        setNewTechPassword('');
        setNewTechCategory('General');
        alert('Technician registered/updated successfully!');
        fetchUsers();
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update user to technician');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating technician');
    }
  };

  const handlePromoteExistingToTech = async (existingUser: SyncedUser) => {
    if (!user || user.role !== 'Admin') return;
    if (!window.confirm(`Are you sure you want to promote ${existingUser.name} (${existingUser.email}) to Technician?`)) return;
    try {
      const res = await fetch('/api/v1/users/technician', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ name: existingUser.name, email: existingUser.email })
      });

      if (res.ok) {
        alert(`${existingUser.name} is now a Technician!`);
        fetchUsers();
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to promote user');
      }
    } catch (err: any) {
      alert(err.message || 'Error promoting user');
    }
  };

  const fetchChatMessages = async (issueNum: string) => {
    if (!user) return;
    try {
      const headers = { 'Authorization': `Bearer ${user.token}` };
      const res = await fetch(`/api/v1/issues/${issueNum}/messages`, { headers });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching issue messages:", err);
    }
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedIssue || !newChatMessage.trim()) return;

    try {
      setIsSendingMessage(true);
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${user.token}` 
      };
      const res = await fetch(`/api/v1/issues/${selectedIssue.issueNumber}/messages`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: newChatMessage.trim() })
      });

      if (res.ok) {
        setNewChatMessage('');
        fetchChatMessages(selectedIssue.issueNumber);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to send message');
      }
    } catch (err: any) {
      alert(err.message || 'Error sending message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSaveTechProfile = async (newOnline: boolean, newCat: string) => {
    if (!user || user.role !== 'Technician') return;
    setIsTechProfileSaving(true);
    try {
      const res = await fetch('/api/v1/technicians/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ isOnline: newOnline, category: newCat })
      });
      if (res.ok) {
        // Update local storage user
        const storedUserStr = localStorage.getItem('maintainiq_user');
        if (storedUserStr) {
          const storedUser = JSON.parse(storedUserStr);
          const updatedUser = {
            ...storedUser,
            isOnline: newOnline,
            category: newCat,
          };
          localStorage.setItem('maintainiq_user', JSON.stringify(updatedUser));
        }
        setTechIsOnline(newOnline);
        setTechCategory(newCat);
        fetchTechnicians(); // Refresh technicians list
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status');
    } finally {
      setIsTechProfileSaving(false);
    }
  };

  const handleCreateAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(newAsset)
      });

      if (!res.ok) {
        const errData = await safeParseResponse(res);
        throw new Error(errData.error || 'Failed to create asset');
      }

      setShowAddAsset(false);
      setNewAsset({
        name: '',
        code: '',
        category: 'Electrical',
        location: '',
        condition: 'Good',
        status: 'Operational',
        lastServiceDate: new Date().toISOString().split('T')[0],
        nextServiceDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        assignedTechnician: '',
      });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error creating asset');
    }
  };

  const handleDeleteAsset = async (code: string) => {
    if (!user) return;
    if (!window.confirm(`Are you absolutely sure you want to delete asset "${code}"? This will clear its digital record.`)) return;

    try {
      const res = await fetch(`/api/v1/assets/${code}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        fetchData();
        setSelectedAsset(null);
      } else {
        const data = await safeParseResponse(res);
        alert(data.error || 'Failed to delete asset');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleIssueSelect = (issue: Issue) => {
    setSelectedIssue(issue);
    setIssueUpdate({
      status: issue.status,
      assignedTechnician: issue.assignedTechnician || '',
      maintenanceNotes: issue.maintenanceNotes || '',
      partsReplaced: issue.partsReplaced || '',
      maintenanceCost: issue.maintenanceCost || 0,
      nextServiceDate: '',
    });
    if (user?.role === 'Admin') {
      fetchTechnicians();
    }
  };

  const handleUpdateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedIssue) return;

    // Front-end Validations
    if (issueUpdate.status === 'Resolved' && (!issueUpdate.maintenanceNotes || issueUpdate.maintenanceNotes.trim() === '')) {
      alert('An issue cannot be marked as "Resolved" without technician maintenance notes.');
      return;
    }

    if (issueUpdate.maintenanceCost < 0) {
      alert('Maintenance cost cannot be negative.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/issues/${selectedIssue.issueNumber}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(issueUpdate)
      });

      if (!res.ok) {
        const errData = await safeParseResponse(res);
        throw new Error(errData.error || 'Failed to update issue');
      }

      setSelectedIssue(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Error updating issue');
    }
  };

  // Status Badges
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Operational':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3 mr-1" /> Operational</span>;
      case 'Issue Reported':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1" /> Issue Reported</span>;
      case 'Under Inspection':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" /> Under Inspection</span>;
      case 'Under Maintenance':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800"><Hammer className="w-3 h-3 mr-1" /> Under Maintenance</span>;
      case 'Out of Service':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800"><ShieldAlert className="w-3 h-3 mr-1" /> Out of Service</span>;
      case 'Retired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700"><Ban className="w-3 h-3 mr-1" /> Retired</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'Critical':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse"><ShieldAlert className="w-3 h-3 mr-1" /> Critical</span>;
      case 'High':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800"><AlertTriangle className="w-3 h-3 mr-1" /> High</span>;
      case 'Medium':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Medium</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Low</span>;
    }
  };

  const printLabel = (id: string) => {
    const printContent = document.getElementById(id);
    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
    if (printWindow && printContent) {
      printWindow.document.write(printContent.innerHTML);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  // Filter lists
  const filteredAssets = assets.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(assetSearch.toLowerCase()) || item.code.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesStatus = assetStatusFilter === '' || item.status === assetStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredIssues = issues.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(issueSearch.toLowerCase()) || item.issueNumber.toLowerCase().includes(issueSearch.toLowerCase()) || item.assetCode.toLowerCase().includes(issueSearch.toLowerCase());
    const matchesPriority = issuePriorityFilter === '' || item.priority === issuePriorityFilter;
    return matchesSearch && matchesPriority;
  });

  // Summary Metrics for Analytics
  const totalAssets = assets.length;
  const operationalAssets = assets.filter(a => a.status === 'Operational').length;
  const reportedIssues = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;
  const criticalIssues = issues.filter(i => i.priority === 'Critical' && i.status !== 'Resolved').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-slate-950 text-white shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg tracking-tight">MaintainIQ</h2>
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{user?.role} Portal</span>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {(user?.role === 'Admin' || user?.role === 'Technician') && (
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
            >
              <LayoutDashboard className="w-5 h-5 mr-3" />
              Analytics Overview
            </button>
          )}
          
          <button
            onClick={() => setActiveTab('assets')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === 'assets' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <Folder className="w-5 h-5 mr-3" />
            Assets Directory
          </button>

          <button
            onClick={() => setActiveTab('issues')}
            className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === 'issues' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
          >
            <AlertTriangle className="w-5 h-5 mr-3" />
            Issues Board
            {reportedIssues > 0 && (
              <span className="ml-auto inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
                {reportedIssues}
              </span>
            )}
          </button>

          {(user?.role === 'Admin' || user?.role === 'Technician') && (
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
            >
              <History className="w-5 h-5 mr-3" />
              Permanent Audit Logs
            </button>
          )}

          {user?.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition cursor-pointer ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
            >
              <Shield className="w-5 h-5 mr-3" />
              User Directory
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-9 h-9 bg-slate-800 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-4 py-2 border border-slate-700 hover:border-rose-500 rounded-xl text-xs font-semibold text-slate-300 hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
              <p className="mt-4 text-slate-600 font-medium">Synchronizing system data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Technician Specialty and Availability Toggle Card */}
            {user?.role === 'Technician' && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 mb-2 animate-fadeIn">
                <div className="flex items-center space-x-3.5">
                  <div className={`p-3 rounded-2xl ${techIsOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    <User className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center">
                      Availability Status Panel
                      {techIsOnline ? (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          ● Active Online
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-150 text-slate-500">
                          ○ Offline
                        </span>
                      )}
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">Toggle your active duty status and specialized category.</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="w-full sm:w-auto">
                    <select
                      value={techCategory}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        setTechCategory(newCat);
                        handleSaveTechProfile(techIsOnline, newCat);
                      }}
                      className="w-full sm:w-36 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Electrical">Electrical</option>
                      <option value="HVAC">HVAC</option>
                      <option value="Plumbing">Plumbing</option>
                      <option value="IT Hardware">IT Hardware</option>
                      <option value="Safety">Safety</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={isTechProfileSaving}
                    onClick={() => {
                      const nextOnline = !techIsOnline;
                      setTechIsOnline(nextOnline);
                      handleSaveTechProfile(nextOnline, techCategory);
                    }}
                    className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer ${
                      techIsOnline 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-slate-800 hover:bg-slate-900 text-white'
                    }`}
                  >
                    {isTechProfileSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" />
                    ) : techIsOnline ? (
                      'Set Offline'
                    ) : (
                      'Set Online'
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {/* Tab 1: Analytics Overview */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Dashboard</h1>
                    <p className="text-sm text-slate-500">Real-time assets, maintenance logs and reporting overview.</p>
                  </div>
                  <button 
                    onClick={fetchData} 
                    className="self-start inline-flex items-center px-3 py-1.5 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Refresh Feed
                  </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Assets</span>
                      <span className="mt-1 text-3xl font-extrabold text-slate-900">{totalAssets}</span>
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Folder className="w-6 h-6" /></div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational Rate</span>
                      <span className="mt-1 text-3xl font-extrabold text-slate-900">
                        {totalAssets > 0 ? `${Math.round((operationalAssets / totalAssets) * 100)}%` : '0%'}
                      </span>
                    </div>
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle className="w-6 h-6" /></div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Problems</span>
                      <span className="mt-1 text-3xl font-extrabold text-slate-900">{reportedIssues}</span>
                    </div>
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><AlertTriangle className="w-6 h-6" /></div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Safety Issues</span>
                      <span className="mt-1 text-3xl font-extrabold text-rose-600">{criticalIssues}</span>
                    </div>
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl animate-pulse"><ShieldAlert className="w-6 h-6" /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* Left block: Pending Issues list */}
                  <div className="lg:col-span-3 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-4">Urgent Attention Pending</h3>
                    <div className="divide-y divide-slate-100">
                      {issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length === 0 ? (
                        <p className="text-sm text-slate-500 py-4 italic">No unresolved issues reported. All assets healthy.</p>
                      ) : (
                        issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').slice(0, 5).map((issue, idx) => (
                          <div key={idx} className="py-3 flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{issue.title}</h4>
                              <p className="text-xs text-slate-500 font-medium">Asset: {issue.assetCode} • Opened on {new Date(issue.createdAt || '').toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getPriorityBadge(issue.priority)}
                              <button 
                                onClick={() => { setActiveTab('issues'); handleIssueSelect(issue); }}
                                className="px-2 py-1 bg-slate-50 border border-slate-200 text-xs font-semibold rounded text-slate-600 hover:bg-slate-100 cursor-pointer"
                              >
                                Triage
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Right block: Operational Quick Links */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-2">QR Code Printing Desk</h3>
                      <p className="text-xs text-slate-500 mb-4 leading-relaxed">Select assets from the directory tab to print high-resolution diagnostic labels containing QR codes for facility deployment.</p>
                    </div>
                    <div className="border border-blue-100 bg-blue-50/50 rounded-2xl p-4">
                      <div className="flex items-start space-x-3">
                        <QrCode className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">Quick QR Mapping</h4>
                          <p className="text-[11px] text-slate-600 leading-normal mt-0.5">Every asset code generated maps directly to a public report URL. Perfect for placing on actual devices.</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab('assets')}
                      className="mt-4 w-full flex items-center justify-center py-2 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                    >
                      Browse Assets Directory
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Tab 2: Assets Directory */}
            {activeTab === 'assets' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Assets Inventory</h1>
                    <p className="text-sm text-slate-500">Track conditions, schedule services and generate QR passports.</p>
                  </div>
                  {user?.role === 'Admin' && (
                    <button
                      onClick={() => setShowAddAsset(true)}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md shadow-blue-200 transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Register New Asset
                    </button>
                  )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search assets by name or code..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <select
                      value={assetStatusFilter}
                      onChange={(e) => setAssetStatusFilter(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">All Statuses</option>
                      <option value="Operational">Operational</option>
                      <option value="Issue Reported">Issue Reported</option>
                      <option value="Under Inspection">Under Inspection</option>
                      <option value="Under Maintenance">Under Maintenance</option>
                      <option value="Out of Service">Out of Service</option>
                      <option value="Retired">Retired</option>
                    </select>
                  </div>
                </div>

                {/* Assets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAssets.length === 0 ? (
                    <div className="col-span-full bg-white p-10 border border-slate-100 rounded-2xl text-center">
                      <p className="text-sm text-slate-500 italic">No assets match the current search filters.</p>
                    </div>
                  ) : (
                    filteredAssets.map((asset) => (
                      <div key={asset.code} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                              {asset.code}
                            </span>
                            {getStatusBadge(asset.status)}
                          </div>

                          <h3 className="text-base font-bold text-slate-950 tracking-tight mb-1">{asset.name}</h3>
                          <div className="space-y-1.5 text-xs text-slate-600 font-medium my-4">
                            <p className="flex items-center"><Tag className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {asset.category}</p>
                            <p className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {asset.location}</p>
                            <p className="flex items-center"><PenTool className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> Condition: <span className="ml-1 text-slate-900 font-bold">{asset.condition}</span></p>
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                          <button
                            onClick={() => setShowQRLabel(asset)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 transition cursor-pointer"
                          >
                            <QrCode className="w-3.5 h-3.5 mr-1" />
                            Passport QR
                          </button>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedAsset(asset)}
                              className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold text-blue-600 transition cursor-pointer"
                            >
                              Timeline
                            </button>
                            <a 
                              href={`/assets/public/${asset.code}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-600 transition"
                            >
                              Public Passport
                            </a>
                            {user?.role === 'Admin' && (
                              <button 
                                onClick={() => handleDeleteAsset(asset.code)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Asset Modal */}
                {showAddAsset && (
                  <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl animate-scaleUp">
                      <h2 className="text-xl font-bold text-slate-900 mb-6">Register Corporate Asset</h2>
                      
                      <form onSubmit={handleCreateAsset} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Asset Name</label>
                            <input
                              type="text"
                              value={newAsset.name}
                              onChange={(e) => setNewAsset({...newAsset, name: e.target.value})}
                              placeholder="Classroom Projector 01"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Unique Asset Code</label>
                            <input
                              type="text"
                              value={newAsset.code}
                              onChange={(e) => {
                                const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '-').replace(/-+/g, '-');
                                setNewAsset({...newAsset, code: val});
                              }}
                              placeholder="PROJ-01"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Category</label>
                            <select
                              value={newAsset.category}
                              onChange={(e) => setNewAsset({...newAsset, category: e.target.value})}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            >
                              <option value="IT / AV">IT / AV</option>
                              <option value="HVAC">HVAC</option>
                              <option value="Electrical">Electrical</option>
                              <option value="Plumbing">Plumbing</option>
                              <option value="Mechanical">Mechanical</option>
                              <option value="Safety">Safety</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Location</label>
                            <input
                              type="text"
                              value={newAsset.location}
                              onChange={(e) => setNewAsset({...newAsset, location: e.target.value})}
                              placeholder="e.g. Room 401"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Condition</label>
                            <select
                              value={newAsset.condition}
                              onChange={(e) => setNewAsset({...newAsset, condition: e.target.value})}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                            >
                              <option value="Good">Good</option>
                              <option value="Fair">Fair</option>
                              <option value="Poor">Poor</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Initial Status</label>
                            <select
                              value={newAsset.status}
                              onChange={(e) => setNewAsset({...newAsset, status: e.target.value as any})}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                            >
                              <option value="Operational">Operational</option>
                              <option value="Issue Reported">Issue Reported</option>
                              <option value="Under Inspection">Under Inspection</option>
                              <option value="Under Maintenance">Under Maintenance</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Last Serviced</label>
                            <input
                              type="date"
                              value={newAsset.lastServiceDate}
                              onChange={(e) => setNewAsset({...newAsset, lastServiceDate: e.target.value})}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Next Service Due</label>
                            <input
                              type="date"
                              value={newAsset.nextServiceDate}
                              onChange={(e) => setNewAsset({...newAsset, nextServiceDate: e.target.value})}
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                              required
                            />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3 border-t border-slate-100 pt-5 mt-6">
                          <button
                            type="button"
                            onClick={() => setShowAddAsset(false)}
                            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-semibold text-slate-600 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition cursor-pointer"
                          >
                            Save Asset Passport
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Printable QR Code Label Modal */}
                {showQRLabel && (
                  <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-100 shadow-2xl">
                      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                        <QrCode className="w-5 h-5 mr-1.5 text-blue-600" />
                        Print Asset QR Label
                      </h2>

                      {/* Print Canvas Area */}
                      <div id={`qr-label-container-${showQRLabel.code}`} className="bg-white border-4 border-slate-950 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
                        <div className="border-b border-dashed border-slate-900 pb-2 w-full">
                          <h3 className="text-sm font-black text-slate-900 tracking-wider">MAINTAINIQ CENTRAL FACILITY</h3>
                          <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">Digital Identity Passport</span>
                        </div>

                        {/* Generates standard API qr code */}
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/assets/public/${showQRLabel.code}`)}`}
                          alt={`QR Code for ${showQRLabel.code}`}
                          className="w-40 h-40 border border-slate-200 p-2"
                        />

                        <div className="space-y-1">
                          <h4 className="text-base font-black text-slate-950 leading-tight">{showQRLabel.name}</h4>
                          <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">{showQRLabel.code}</p>
                          <p className="text-[10px] font-bold text-slate-600">Location: {showQRLabel.location}</p>
                        </div>

                        <div className="border-t border-dashed border-slate-900 pt-3 w-full">
                          <p className="text-[9px] font-black text-slate-900 tracking-wide uppercase">SCAN QR TO REPORT ISSUES & DIAGNOSE</p>
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-3 justify-end">
                        <button
                          onClick={() => setShowQRLabel(null)}
                          className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-xl text-slate-600 transition cursor-pointer"
                        >
                          Close Preview
                        </button>
                        <button
                          onClick={() => printLabel(`qr-label-container-${showQRLabel.code}`)}
                          className="inline-flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1.5" />
                          Print Label
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Asset Details & Contextual Timeline Modal */}
                {selectedAsset && (
                  <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-100 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
                        <div>
                          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
                            {selectedAsset.code}
                          </span>
                          <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedAsset.name}</h2>
                          <p className="text-xs text-slate-500 font-medium">Category: <span className="font-semibold text-slate-700">{selectedAsset.category}</span></p>
                        </div>
                        <button
                          onClick={() => setSelectedAsset(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-50 hover:bg-slate-100 p-2 rounded-full cursor-pointer transition-all"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Detail Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Properties</h4>
                          <p className="text-xs text-slate-700 font-medium">Location: <span className="text-slate-900 font-bold">{selectedAsset.location}</span></p>
                          <p className="text-xs text-slate-700 font-medium">Condition: <span className="text-slate-900 font-bold">{selectedAsset.condition}</span></p>
                          <p className="text-xs text-slate-700 font-medium">Current Status: {getStatusBadge(selectedAsset.status)}</p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule & Ownership</h4>
                          <p className="text-xs text-slate-700 font-medium">Last Serviced: <span className="text-slate-900 font-bold">{new Date(selectedAsset.lastServiceDate).toLocaleDateString()}</span></p>
                          <p className="text-xs text-slate-700 font-medium">Next Service Due: <span className="text-slate-900 font-bold">{new Date(selectedAsset.nextServiceDate).toLocaleDateString()}</span></p>
                          <p className="text-xs text-slate-700 font-medium">Assigned Tech: <span className="text-slate-900 font-bold">{selectedAsset.assignedTechnician || 'Unassigned'}</span></p>
                        </div>
                      </div>

                      {/* Filtered Contextual History Timeline */}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                          <History className="w-4 h-4 mr-1.5 text-blue-600" />
                          Diagnostic Life-Cycle Timeline
                        </h3>

                        <div className="border border-slate-100 rounded-2xl bg-slate-50/50 p-4 max-h-60 overflow-y-auto space-y-4">
                          {history.filter(log => log.assetCode === selectedAsset.code).length === 0 ? (
                            <p className="text-xs text-slate-500 italic text-center py-6">No historical records registered for this asset code.</p>
                          ) : (
                            <div className="relative border-l-2 border-blue-100 pl-4 ml-2 space-y-4">
                              {history
                                .filter(log => log.assetCode === selectedAsset.code)
                                .map((log, idx) => (
                                  <div key={idx} className="relative">
                                    {/* Indicator dot */}
                                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
                                    <div>
                                      <div className="flex items-center space-x-2">
                                        <span className="font-mono text-[10px] font-bold text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                        <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700">{log.action}</span>
                                      </div>
                                      <p className="mt-1 text-xs text-slate-700 font-medium">{log.details}</p>
                                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">By: {log.actor}</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end space-x-3 border-t border-slate-100 pt-5">
                        <button
                          onClick={() => {
                            const assetRef = selectedAsset;
                            setSelectedAsset(null);
                            setShowQRLabel(assetRef);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 rounded-xl transition cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1.5" />
                          Generate QR Label
                        </button>
                        <button
                          onClick={() => setSelectedAsset(null)}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Close Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* Tab 3: Issues Board */}
            {activeTab === 'issues' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Issues Triage Board</h1>
                  <p className="text-sm text-slate-500">Respond to reported faults, assign technicians and log maintenance completions.</p>
                </div>

                {/* Available Technicians and User Reports for Users */}
                {(user?.role === 'User' || user?.role === 'Admin' || user?.role === 'Technician') && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-sm font-bold text-slate-900">Active Service Technicians</h3>
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Live Availability</span>
                        </div>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto">
                          {techniciansList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No facility technicians are registered yet.</p>
                          ) : (
                            techniciansList.map(tech => (
                              <div key={tech.email} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="truncate">
                                  <p className="text-xs font-bold text-slate-800 truncate">{tech.name}</p>
                                  <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 uppercase tracking-wide mt-0.5">
                                    {tech.category || 'General'}
                                  </span>
                                </div>
                                <div>
                                  {tech.isOnline ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 animate-pulse">
                                      ● Online
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-200 text-slate-600">
                                      ○ Offline
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center space-x-2 border-b border-slate-100 pb-2 mb-3">
                            <QrCode className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-900">QR Code Scanner Simulator</h3>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            Simulate scanning physical QR codes using active assets loaded from MongoDB.
                          </p>

                          {assets.length > 0 && (
                            <div className="mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5">Click an active MongoDB asset code to load:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {assets.map(asset => (
                                  <button
                                    key={asset.code}
                                    type="button"
                                    onClick={() => {
                                      setQrInputCode(asset.code);
                                      setReportAssetCode(asset.code);
                                    }}
                                    className={`px-2 py-1 text-[11px] font-mono font-black rounded-lg transition cursor-pointer border ${
                                      qrInputCode === asset.code
                                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-sm'
                                        : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                                    }`}
                                  >
                                    {asset.code}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-2 mb-4">
                            <input
                              type="text"
                              value={qrInputCode}
                              onChange={(e) => setQrInputCode(e.target.value.toUpperCase())}
                              placeholder="Enter Asset Code (e.g. PROJ-01)"
                              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!qrInputCode.trim()) {
                                  alert('Please enter an Asset Code to simulate scanning.');
                                  return;
                                }
                                window.open(`/assets/public/${qrInputCode.trim()}`, '_blank');
                              }}
                              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                            >
                              Scan QR Code
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (qrInputCode.trim()) {
                                setReportAssetCode(qrInputCode.trim());
                              }
                              setShowReportIssue(true);
                            }}
                            className="flex-1 bg-slate-950 text-white font-bold py-2 rounded-xl text-xs hover:bg-slate-900 transition"
                          >
                            Report Issue Directly
                          </button>
                        </div>
                      </div>
                    </div>

                    {showReportIssue && (
                      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
                          <h3 className="text-xl font-bold text-slate-900 mb-6">Report a Problem</h3>
                          <form onSubmit={async (e) => {
                            e.preventDefault();
                            if (!user) {
                              alert('You must be logged in to report an issue.');
                              return;
                            }
                            const res = await fetch('/api/v1/issues/public/report', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${user.token}`
                              },
                              body: JSON.stringify({
                                assetCode: reportAssetCode,
                                title: reportTitle,
                                description: reportDescription,
                                priority: reportPriority,
                                category: reportCategory,
                                reporterName: user.name,
                                reporterEmail: user.email
                              })
                            });
                            if (res.ok) {
                              setShowReportIssue(false);
                              // Reset form
                              setReportAssetCode('');
                              setReportTitle('');
                              setReportDescription('');
                              setReportCategory('');
                              setReportPriority('Low');
                              // Refresh issues
                              fetchData(); 
                            } else {
                              const data = await safeParseResponse(res);
                              alert(data.error || 'Failed to submit report');
                            }
                          }} className="space-y-4">
                            <select className="w-full p-2 border rounded-xl" value={reportAssetCode} onChange={(e) => setReportAssetCode(e.target.value)} required>
                              <option value="">Select Asset</option>
                              {assets.map(asset => <option key={asset.code} value={asset.code}>{asset.code} - {asset.name}</option>)}
                            </select>
                            <input type="text" placeholder="Title" className="w-full p-2 border rounded-xl" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} required />
                            <textarea placeholder="Description" className="w-full p-2 border rounded-xl" value={reportDescription} onChange={(e) => setReportDescription(e.target.value)} required />
                            <button type="button" onClick={async () => {
                              const res = await fetch('/api/v1/issues/suggest-description', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ title: reportTitle, assetCode: reportAssetCode })
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setReportDescription(data.suggestion);
                              } else if (res.status === 429) {
                                alert('AI service is currently busy. Please try again in a few seconds.');
                              } else {
                                alert('Failed to generate suggestion. Please try again.');
                              }
                            }} className="w-full bg-emerald-100 text-emerald-800 font-bold py-2 rounded-xl text-sm hover:bg-emerald-200">Ask AI for Suggestion</button>
                            <select className="w-full p-2 border rounded-xl" value={reportPriority} onChange={(e) => setReportPriority(e.target.value)}>
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                            <input type="text" placeholder="Category" className="w-full p-2 border rounded-xl" value={reportCategory} onChange={(e) => setReportCategory(e.target.value)} required />
                            <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl text-sm hover:bg-blue-700">Submit Report</button>
                          </form>
                          <button
                            onClick={() => setShowReportIssue(false)}
                            className="mt-4 w-full bg-slate-200 text-slate-800 font-bold py-2 rounded-xl text-sm hover:bg-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search issues by title, asset, REQ..."
                      value={issueSearch}
                      onChange={(e) => setIssueSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <select
                      value={issuePriorityFilter}
                      onChange={(e) => setIssuePriorityFilter(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">All Priorities</option>
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                {/* Issues List Table */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <th className="py-4 px-6">Issue ID</th>
                          <th className="py-4 px-6">Asset Code</th>
                          <th className="py-4 px-6">Title</th>
                          <th className="py-4 px-6">Reporter</th>
                          <th className="py-4 px-6">Priority</th>
                          <th className="py-4 px-6">Status</th>
                          <th className="py-4 px-6 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredIssues.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-sm text-slate-500 italic">No issues currently reported on the board.</td>
                          </tr>
                        ) : (
                          filteredIssues.map((issue) => (
                            <tr key={issue.issueNumber} className="hover:bg-slate-50/50 transition">
                              <td className="py-4 px-6 font-mono text-xs font-bold text-slate-700">{issue.issueNumber}</td>
                              <td className="py-4 px-6 font-mono text-xs text-slate-500 font-semibold">{issue.assetCode}</td>
                              <td className="py-4 px-6">
                                <span className="block text-sm font-bold text-slate-900 leading-tight">{issue.title}</span>
                                <span className="text-[10px] text-slate-400 font-bold">{issue.category} • Opened {new Date(issue.createdAt || '').toLocaleDateString()}</span>
                              </td>
                              <td className="py-4 px-6 text-xs text-slate-600 font-medium">{issue.reporterName}</td>
                              <td className="py-4 px-6">{getPriorityBadge(issue.priority)}</td>
                              <td className="py-4 px-6">
                                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{issue.status}</span>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <button
                                  onClick={() => handleIssueSelect(issue)}
                                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer"
                                >
                                  Triage Work
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Edit & Status progression workflow Modal */}
                {selectedIssue && (
                  <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-slate-100 shadow-2xl animate-scaleUp max-h-[90vh] overflow-y-auto">
                      <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-6">
                        <div>
                          <span className="font-mono text-xs font-bold text-blue-600">{selectedIssue.issueNumber}</span>
                          <h2 className="text-xl font-bold text-slate-900 mt-1">{selectedIssue.title}</h2>
                          <p className="text-xs text-slate-500 font-medium mt-1">Asset Reference: <span className="font-mono text-slate-700 font-bold">{selectedIssue.assetCode}</span></p>
                        </div>
                        <button
                          onClick={() => setSelectedIssue(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-sm bg-slate-50 hover:bg-slate-100 p-2 rounded-full cursor-pointer transition-all"
                        >
                          ✕
                        </button>
                      </div>

                      {/* Reporter & Budget Info */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs text-slate-600">
                          <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">Reporter</h4>
                          <p className="font-semibold text-slate-900">{selectedIssue.reporterName}</p>
                          <p className="text-slate-500 truncate">{selectedIssue.reporterEmail}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs text-slate-600">
                          <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">Repairs Budget</h4>
                          <p className="text-sm font-extrabold text-emerald-600 mt-1">
                            {(selectedIssue as any).budget ? `$${(selectedIssue as any).budget}` : '$0.00'}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 mb-6 text-xs text-slate-600 leading-relaxed">
                        <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">Issue Description</h4>
                        {selectedIssue.description}
                      </div>

                      {/* Role Guarded Forms or Display */}
                      {(user?.role === 'Admin' || user?.role === 'Technician') ? (
                        <form onSubmit={handleUpdateIssue} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Workflow Status</label>
                              <select
                                value={issueUpdate.status}
                                onChange={(e) => setIssueUpdate({...issueUpdate, status: e.target.value as any})}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                              >
                                <option value="Reported">Reported</option>
                                <option value="Assigned">Assigned</option>
                                <option value="Inspection Started">Inspection Started</option>
                                <option value="Maintenance In Progress">Maintenance In Progress</option>
                                <option value="Waiting for Parts">Waiting for Parts</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Closed">Closed</option>
                                <option value="Reopened">Reopened</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned Technician</label>
                              {user?.role === 'Admin' ? (
                                <select
                                  value={issueUpdate.assignedTechnician}
                                  onChange={(e) => setIssueUpdate({...issueUpdate, assignedTechnician: e.target.value})}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                                >
                                  <option value="">Unassigned</option>
                                  {techniciansList.map(tech => (
                                    <option key={tech.email} value={tech.name}>{tech.name} ({tech.email})</option>
                                  ))}
                                  {issueUpdate.assignedTechnician && !techniciansList.some(u => u.name === issueUpdate.assignedTechnician) && (
                                    <option value={issueUpdate.assignedTechnician}>{issueUpdate.assignedTechnician}</option>
                                  )}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={issueUpdate.assignedTechnician}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50"
                                  disabled
                                />
                              )}
                            </div>
                          </div>

                          {/* Additional maintenance records required when resolving */}
                          <div className="space-y-4 border-t border-slate-100 pt-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Technician Service Fields</h3>
                            
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Maintenance Action Notes</label>
                                <button
                                  type="button"
                                  onClick={() => handleImproveWriting(
                                    issueUpdate.maintenanceNotes, 
                                    `Maintenance action notes for issue: ${selectedIssue?.title} on asset ${selectedIssue?.assetCode}`,
                                    (val) => setIssueUpdate({...issueUpdate, maintenanceNotes: val})
                                  )}
                                  disabled={isImprovingWriting || !issueUpdate.maintenanceNotes.trim()}
                                  className="inline-flex items-center text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition disabled:opacity-50"
                                >
                                  {isImprovingWriting ? (
                                    <>
                                      <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" />
                                      Improving...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-2.5 h-2.5 mr-1" />
                                      Gen Ai: Improve Writing
                                    </>
                                  )}
                                </button>
                              </div>
                              <textarea
                                value={issueUpdate.maintenanceNotes}
                                onChange={(e) => setIssueUpdate({...issueUpdate, maintenanceNotes: e.target.value})}
                                placeholder="Describe actions performed, findings or blockages resolved."
                                rows={2}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700"
                                required={issueUpdate.status === 'Resolved'}
                              />
                              {issueUpdate.status === 'Resolved' && (
                                <p className="mt-1 text-[10px] text-amber-600 font-medium">Notes are strictly required to resolve issues.</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Parts Replaced</label>
                                <input
                                  type="text"
                                  value={issueUpdate.partsReplaced}
                                  onChange={(e) => setIssueUpdate({...issueUpdate, partsReplaced: e.target.value})}
                                  placeholder="e.g. Starter solenoid"
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Cost ($)</label>
                                <input
                                  type="number"
                                  value={issueUpdate.maintenanceCost}
                                  onChange={(e) => setIssueUpdate({...issueUpdate, maintenanceCost: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                                  min={0}
                                />
                              </div>
                            </div>

                            {issueUpdate.status === 'Resolved' && (
                              <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Reschedule Next Service Due Date</label>
                                <input
                                  type="date"
                                  value={issueUpdate.nextServiceDate}
                                  onChange={(e) => setIssueUpdate({...issueUpdate, nextServiceDate: e.target.value})}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold"
                                  required
                                />
                              </div>
                            )}
                          </div>

                          <div className="flex justify-end space-x-3 border-t border-slate-100 pt-5 mt-4">
                            <button
                              type="submit"
                              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
                            >
                              Save Maintenance Records
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="space-y-4 border-t border-slate-100 pt-4">
                          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Maintenance Status</h3>
                          <div className="flex items-center space-x-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                            <div>
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Current Status</p>
                              <p className="text-xs font-extrabold text-slate-800">{selectedIssue.status}</p>
                            </div>
                            <div className="ml-auto text-right">
                              <p className="text-[10px] text-slate-500 font-bold uppercase">Assigned Technician</p>
                              <p className="text-xs font-extrabold text-slate-800">{selectedIssue.assignedTechnician || 'Unassigned'}</p>
                            </div>
                          </div>
                          
                          {selectedIssue.maintenanceNotes && (
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 text-xs text-slate-600">
                              <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">Technician Maintenance Notes</h4>
                              {selectedIssue.maintenanceNotes}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Live Group Chat Section */}
                      <div className="border-t border-slate-150 pt-6 mt-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900 flex items-center">
                            <RefreshCw className="w-4 h-4 mr-1.5 text-blue-600 animate-spin" style={{ animationDuration: '6s' }} />
                            Live Complaint Support Chat
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                            {selectedIssue.assignedTechnician ? 'Group Chat Active' : 'Waiting for Assignment'}
                          </span>
                        </div>

                        {!selectedIssue.assignedTechnician ? (
                          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-center">
                            <p className="text-xs text-slate-500 italic">
                              The support group chat is automatically created once a technician is assigned to this issue. Please wait for an administrator to review and assign a technician.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Messages List */}
                            <div className="border border-slate-150 rounded-2xl bg-slate-50/50 p-4 max-h-60 overflow-y-auto space-y-3 flex flex-col">
                              {chatMessages.length === 0 ? (
                                <p className="text-xs text-slate-400 italic text-center py-6">
                                  No messages yet. Customer and Technician can start talking here.
                                </p>
                              ) : (
                                chatMessages.map((msg, idx) => {
                                  const isMe = msg.senderEmail.toLowerCase() === user?.email.toLowerCase();
                                  return (
                                    <div 
                                      key={idx} 
                                      className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
                                    >
                                      <div className="flex items-center space-x-1.5 mb-1">
                                        <span className="text-[9px] font-bold text-slate-400">{msg.senderName} ({msg.role})</span>
                                      </div>
                                      <div className={`px-3.5 py-2 rounded-2xl text-xs ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                        <p className="leading-relaxed">{msg.message}</p>
                                      </div>
                                      <span className="text-[8px] text-slate-400 mt-0.5 font-medium">
                                        {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                              <div ref={messagesEndRef} />
                            </div>

                            {/* Message Input Box */}
                            <form onSubmit={handleSendChatMessage} className="flex gap-2">
                              <input
                                type="text"
                                value={newChatMessage}
                                onChange={(e) => setNewChatMessage(e.target.value)}
                                placeholder="Type a message to customer/technician..."
                                className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={isSendingMessage}
                              />
                              <button
                                type="submit"
                                disabled={isSendingMessage || !newChatMessage.trim()}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center transition cursor-pointer disabled:opacity-50"
                              >
                                {isSendingMessage ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Send className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Audit Logs */}
            {activeTab === 'history' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">Permanent Audit Logs</h1>
                  <p className="text-sm text-slate-500">Immutable blockchain-style chronological logging records for facility verification.</p>
                </div>

                <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
                  {history.length === 0 ? (
                    <p className="text-sm text-slate-500 italic text-center py-10">No logs registered yet.</p>
                  ) : (
                    <div className="space-y-6">
                      {history.map((log, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-start sm:justify-between py-4 border-b border-slate-100 gap-2">
                          <div className="flex items-start space-x-3">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-xs font-semibold text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">{log.action}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-700 font-medium leading-relaxed">{log.details}</p>
                            </div>
                          </div>
                          <div className="self-start sm:self-center">
                            <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                              Actor: {log.actor}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 5: Users Directory (Admin Only) */}
            {activeTab === 'users' && user?.role === 'Admin' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Users & Staff Directory</h1>
                    <p className="text-sm text-slate-500">Manage user authorization roles, register technicians, and audit active accounts.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Add Technician Form */}
                  <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center">
                      <Plus className="w-4 h-4 mr-1.5 text-blue-600" />
                      Register New Technician
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Enter the name and email of a new technician. If they register with this email, they will automatically be assigned the Technician role. If an existing user matches, they will be promoted. You can also assign a password for their account.
                    </p>

                    <form onSubmit={handleAddTechnician} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Technician Name</label>
                        <input
                          type="text"
                          value={newTechName}
                          onChange={(e) => setNewTechName(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                        <input
                          type="email"
                          value={newTechEmail}
                          onChange={(e) => setNewTechEmail(e.target.value)}
                          placeholder="john.doe@maintainiq.com"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Account Password</label>
                        <input
                          type="password"
                          value={newTechPassword}
                          onChange={(e) => setNewTechPassword(e.target.value)}
                          placeholder="Minimum 6 characters"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Specialty Category</label>
                        <select
                          value={newTechCategory}
                          onChange={(e) => setNewTechCategory(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 bg-white"
                        >
                          <option value="General">General</option>
                          <option value="Electrical">Electrical</option>
                          <option value="HVAC">HVAC</option>
                          <option value="Plumbing">Plumbing</option>
                          <option value="IT Hardware">IT Hardware</option>
                          <option value="Safety">Safety</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
                      >
                        Register Technician
                      </button>
                    </form>
                  </div>

                  {/* Right: Active Users List */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-slate-900">Synchronized Database Profiles</h3>
                      <button 
                        onClick={fetchUsers}
                        className="inline-flex items-center px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 transition"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Reload
                      </button>
                    </div>

                    {isUsersLoading ? (
                      <div className="py-10 text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                        <p className="mt-2 text-xs text-slate-400 font-medium">Fetching registered profiles...</p>
                      </div>
                    ) : usersList.length === 0 ? (
                      <p className="text-xs text-slate-500 italic text-center py-10">No synchronized user profiles found.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              <th className="py-3 px-4">Name</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4">Role</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {usersList.map((usr) => (
                              <tr key={usr._id || usr.email} className="hover:bg-slate-50/50 transition">
                                <td className="py-3 px-4">
                                  <div className="flex items-center">
                                    {usr.role === 'Technician' && (
                                      <span className={`w-2 h-2 rounded-full mr-2 ${usr.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} title={usr.isOnline ? 'Online' : 'Offline'}></span>
                                    )}
                                    <span className="text-sm font-bold text-slate-800">{usr.name}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-xs font-mono text-slate-500">{usr.email}</td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col">
                                    <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                      usr.role === 'Admin' ? 'bg-purple-100 text-purple-800' :
                                      usr.role === 'Technician' ? 'bg-blue-100 text-blue-800' :
                                      'bg-slate-100 text-slate-800'
                                    }`}>
                                      {usr.role}
                                    </span>
                                    {usr.role === 'Technician' && usr.category && (
                                      <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">{usr.category}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  {usr.role === 'User' && (
                                    <button
                                      onClick={() => handlePromoteExistingToTech(usr)}
                                      className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] font-bold transition cursor-pointer"
                                    >
                                      Promote to Tech
                                    </button>
                                  )}
                                  {usr.role === 'Technician' && (
                                    <span className="text-[10px] text-slate-400 font-medium italic">Active Tech</span>
                                  )}
                                  {usr.role === 'Admin' && (
                                    <span className="text-[10px] text-purple-400 font-medium italic">Super Admin</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </>
        )}

      </main>

    </div>
  );
}
