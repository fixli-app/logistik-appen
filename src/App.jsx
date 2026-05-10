import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { QRCodeSVG } from 'qrcode.react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts' 
import { isWithinInterval, startOfDay, endOfDay, subDays, parseISO } from 'date-fns' 

// ============================================================
// STYLING & DESIGN SYSTEM 
// ============================================================

if (typeof document !== 'undefined' && !document.getElementById('hoganas-modern-css')) {
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap'
  document.head.appendChild(link)

  const s = document.createElement('style')
  s.id = 'hoganas-modern-css'
  s.innerHTML = `
    *, *::before, *::after { box-sizing: border-box; }
    html, body, #root { background: #f8fafc; }
    body {
      margin: 0;
      font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
      color: #0f172a;
      -webkit-font-smoothing: antialiased;
      background:
        radial-gradient(1200px 600px at -10% -20%, #e0e7ff 0%, transparent 60%),
        radial-gradient(900px 500px at 110% 10%, #dbeafe 0%, transparent 55%),
        linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 100%);
      background-attachment: fixed;
    }
    h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 24px;
    }
    h2 {
      font-size: 20px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 16px;
    }
    button { font-family: inherit; transition: transform .12s ease, box-shadow .18s ease, background .18s ease, opacity .18s ease; letter-spacing: .01em; }
    button:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px -10px rgba(15,23,42,.25); }
    button:active:not(:disabled) { transform: translateY(0); }
    button:disabled { opacity: .55; cursor: not-allowed; }
    input, select, textarea { font-family: inherit; transition: border-color .15s, box-shadow .15s, background .15s; }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #4f46e5 !important;
      box-shadow: 0 0 0 4px rgba(79,70,229,.15);
    }
    a { transition: opacity .15s; }
    a:hover { opacity: .8; }
    ::-webkit-scrollbar { width: 10px; height: 10px; }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    @keyframes hg-fadein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
    section { animation: hg-fadein .3s ease both; }
  `
  document.head.appendChild(s)
}

const containerStyle = {
  width: '100%',
  maxWidth: '760px',
  margin: 'auto',
  padding: '32px 20px 80px',
  boxSizing: 'border-box',
  fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
  color: '#0f172a',
  minHeight: '100vh'
}

const navStyle = {
  display: 'flex',
  gap: '6px',
  marginBottom: '32px',
  flexWrap: 'wrap',
  padding: '6px',
  background: 'rgba(255,255,255,0.85)',
  border: '1px solid rgba(226,232,240,0.9)',
  borderRadius: '12px',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  boxShadow: '0 4px 15px -10px rgba(15,23,42,0.1)'
}

const navBtn = {
  flex: 1,
  padding: '10px 14px',
  cursor: 'pointer',
  border: '1px solid transparent',
  borderRadius: '8px',
  background: 'transparent',
  color: '#475569',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.01em'
}

const activeNavBtn = {
  ...navBtn,
  background: '#0f172a',
  color: '#fff',
  borderColor: 'transparent',
  boxShadow: '0 4px 12px -4px rgba(15,23,42,0.4)'
}

const scannerBtn = {
  ...navBtn,
  background: '#ef4444',
  color: '#fff',
  borderColor: 'transparent',
  boxShadow: '0 4px 12px -4px rgba(239,68,68,0.4)'
}

const cardStyle = {
  background: '#fff',
  padding: '24px',
  borderRadius: '16px',
  marginBottom: '24px',
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 25px -15px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.05)'
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  marginBottom: '16px',
  borderRadius: '10px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  color: '#0f172a',
  boxSizing: 'border-box',
  fontSize: '15px',
  fontFamily: 'inherit'
}

const selectStyle = { ...inputStyle, padding: '10px 16px', marginBottom: '0', fontSize: '14px' }

const filterLabelStyle = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 700,
  marginBottom: '6px',
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
}

const btnStyle = {
  width: '100%',
  padding: '14px',
  background: '#4f46e5',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 600,
  letterSpacing: '0.01em',
  boxShadow: '0 8px 16px -6px rgba(79,70,229,0.4)'
}

const shipmentCard = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  padding: '18px 20px',
  borderRadius: '12px',
  marginBottom: '14px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  transition: 'transform .15s ease, box-shadow .2s ease, border-color .2s',
  boxShadow: '0 2px 8px -4px rgba(15,23,42,0.08)'
}

const smallBtn = {
  padding: '8px 16px',
  cursor: 'pointer',
  border: 'none',
  borderRadius: '8px',
  background: '#0f172a',
  color: '#fff',
  fontSize: '12px',
  fontWeight: 600,
  letterSpacing: '0.01em',
  boxShadow: '0 2px 6px -2px rgba(15,23,42,0.3)'
}

const fileLink = {
  display: 'inline-block',
  fontSize: '12px',
  color: '#4f46e5',
  textDecoration: 'none',
  textAlign: 'left',
  fontWeight: 500,
  background: '#eef2ff',
  padding: '6px 12px',
  borderRadius: '6px',
  wordBreak: 'break-all',
  border: '1px solid #c7d2fe'
}

const cancelBtn = {
  width: '100%',
  padding: '14px',
  background: '#fff',
  color: '#475569',
  border: '1px solid #cbd5e1',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 600
}

const receiptStyle = {
  textAlign: 'center',
  padding: '30px 20px',
  background: '#f0fdf4',
  border: '1px solid #a7f3d0',
  borderRadius: '16px',
  marginTop: '20px',
  boxShadow: '0 10px 25px -10px rgba(16,185,129,0.2)'
}

const printBtn = {
  display: 'inline-block',
  marginTop: '16px',
  padding: '10px 18px',
  background: '#fff',
  border: '1px solid #10b981',
  color: '#047857',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '14px'
}

const statusBadge = (status) => {
  let bg = '#fef9c3'; let col = '#854d0e'; let border = '#fde047';
  if (status === 'Picked Up')      { bg = '#e0e7ff'; col = '#3730a3'; border = '#c7d2fe'; }
  else if (status === 'Booked')    { bg = '#ffedd5'; col = '#9a3412'; border = '#fdba74'; }
  else if (status === 'Sent')      { bg = '#dcfce7'; col = '#166534'; border = '#86efac'; }
  else if (status === 'Rejected')  { bg = '#fee2e2'; col = '#991b1b'; border = '#fca5a5'; }

  return {
    background: bg,
    color: col,
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    border: `1px solid ${border}`,
    display: 'inline-block'
  }
}

const getFiles = (fileString) => {
  if (!fileString) return []
  try {
    const parsed = JSON.parse(fileString)
    return Array.isArray(parsed) ? parsed : [{ name: 'Attached file', url: fileString }]
  } catch (e) {
    return [{ name: 'Attached file', url: fileString }]
  }
}

// ============================================================
// HUVUDAPPLIKATIONEN
// ============================================================

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('hoganasUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [authMode, setAuthMode] = useState('login'); 
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [allUsers, setAllUsers] = useState([]);
  const [adminPassInputs, setAdminPassInputs] = useState({}); 

  const [profilePassword, setProfilePassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState(''); 
  const [profileReqRole, setProfileReqRole] = useState('logistics');
  const [profileReqComment, setProfileReqComment] = useState('');

  const [shipments, setShipments] = useState([])
  const [view, setView] = useState('user') 
  
  const [searchTerm, setSearchTerm] = useState('') 
  const [filterStatus, setFilterStatus] = useState('All') 
  const [filterLocation, setFilterLocation] = useState('All')
  const [sortBy, setSortBy] = useState('newest') 
  
  const [searchScannerActive, setSearchScannerActive] = useState(false)
  const searchScannerRef = useRef(null)

  const [startDate, setStartDate] = useState('') 
  const [endDate, setEndDate] = useState('') 

  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    loc: '', 
    country: '', 
    carrier: '', 
    files: [] 
  })
  
  const [createdIds, setCreatedIds] = useState([]) 
  const [loading, setLoading] = useState(false)
  const scannerRef = useRef(null)
  const lastScannedRef = useRef({}) // NYTT: Minne för att förhindra dubbelscanning
  const [scanMessage, setScanMessage] = useState('') // NYTT: Flytande notis vid scan
  
  const [expandedPkg, setExpandedPkg] = useState(null)
  const [commentInput, setCommentInput] = useState('') 
  const [commentFile, setCommentFile] = useState(null) 

  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    const targetEmails = [currentUser.email];
    if (currentUser.role === 'admin') targetEmails.push('admin');
    if (currentUser.role === 'logistics' || currentUser.role === 'admin') targetEmails.push('logistics');

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('user_email', targetEmails)
      .order('created_at', { ascending: false });
    
    if (!error) setNotifications(data || []);
  }, [currentUser]);

  const sendNotification = async (targetEmail, title, message, shipmentId = null) => {
    await supabase.from('notifications').insert([{ 
      user_email: targetEmail, 
      title, 
      message, 
      shipment_id: shipmentId 
    }]);
  };

  const markAsRead = async (id) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    fetchNotifications();
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    if (notif.shipment_id) {
      if (currentUser.role === 'user') {
        setView('user');
      } else {
        setView('logistics');
        setSearchTerm(notif.shipment_id.toString());
      }
      setExpandedPkg(notif.shipment_id);
    } else if (notif.user_email === 'admin') {
      setView('admin');
    }
  };

  useEffect(() => {
    if (currentUser) {
      setForm(prev => ({ ...prev, name: currentUser.name, email: currentUser.email }));
      if (currentUser.role === 'user' && view === 'admin') setView('user'); 
      fetchNotifications();
    }
  }, [currentUser, view, fetchNotifications]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);
    
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('email', authEmail.toLowerCase())
      .eq('password', authPassword)
      .single();

    if (error || !data) {
      setAuthError('Invalid email or password.');
    } else if (!data.is_approved) {
      setAuthError('Your account is pending admin approval.');
    } else {
      setCurrentUser(data);
      localStorage.setItem('hoganasUser', JSON.stringify(data));
    }
    setLoading(false);
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setLoading(true);

    if (!authEmail.toLowerCase().endsWith('@hoganas.com')) {
      setAuthError('Email must end with @hoganas.com');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('app_users')
      .insert([{ email: authEmail.toLowerCase(), name: authName, password: authPassword }]);

    if (error) {
      if (error.code === '23505') setAuthError('Email is already registered.');
      else setAuthError(error.message);
    } else {
      alert("Account created successfully! Please wait for an Admin to approve your account.");
      sendNotification('admin', 'New Account Request', `${authName} (${authEmail}) has requested an account.`);
      setAuthMode('login');
      setAuthEmail('');
      setAuthPassword('');
    }
    setLoading(false);
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('app_users')
      .update({ password_reset_requested: true })
      .eq('email', authEmail.toLowerCase());
    
    if (!error) {
      sendNotification('admin', 'Password Reset Request', `User ${authEmail} requested a password reset.`);
    }

    alert("If the email exists in our system, an admin has been notified and will manually reset your password.");
    setAuthMode('login');
    setLoading(false);
  }

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hoganasUser');
    setAuthEmail('');
    setAuthPassword('');
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    if (profilePassword !== profileConfirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    
    if (!window.confirm("Are you sure you want to change your password?")) return;

    setLoading(true);
    const { error } = await supabase.from('app_users').update({ password: profilePassword }).eq('id', currentUser.id);
    if (!error) {
      alert("Password updated successfully!");
      setProfilePassword('');
      setProfileConfirmPassword(''); 
    } else {
      alert("Error updating password.");
    }
    setLoading(false);
  }

  const handleRoleRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('app_users')
      .update({ requested_role: profileReqRole, role_request_comment: profileReqComment })
      .eq('id', currentUser.id);
    
    if (!error) {
      sendNotification('admin', 'Role Change Request', `${currentUser.name} requested ${profileReqRole} access. Comment: ${profileReqComment}`);
      alert("Role request submitted to Admin!");
      setProfileReqComment('');
    } else {
      alert("Error submitting request.");
    }
    setLoading(false);
  }

  const fetchUsers = useCallback(async () => {
    if (currentUser?.role !== 'admin') return;
    const { data } = await supabase.from('app_users').select('*').order('created_at', { ascending: false });
    if (data) setAllUsers(data);
  }, [currentUser]);

  useEffect(() => {
    if (view === 'admin') fetchUsers();
  }, [view, fetchUsers]);

  const toggleUserApproval = async (id, currentStatus) => {
    await supabase.from('app_users').update({ is_approved: !currentStatus }).eq('id', id);
    fetchUsers();
  }

  const changeUserRole = async (id, newRole) => {
    await supabase.from('app_users').update({ role: newRole }).eq('id', id);
    fetchUsers();
  }

  const handleAdminResetPassword = async (id) => {
    const newPass = adminPassInputs[id];
    if (!newPass) return alert("Enter a new password first.");
    await supabase.from('app_users').update({ password: newPass, password_reset_requested: false }).eq('id', id);
    setAdminPassInputs(prev => ({ ...prev, [id]: '' }));
    fetchUsers();
    alert("Password updated! Please notify the user manually via email.");
  }

  const handleApproveRole = async (id, role, email) => {
    await supabase.from('app_users').update({ role: role, requested_role: null, role_request_comment: null }).eq('id', id);
    sendNotification(email, 'Role Request Approved', `Your request for ${role} access was approved.`);
    fetchUsers();
  }

  const handleDenyRole = async (id, email) => {
    await supabase.from('app_users').update({ requested_role: null, role_request_comment: null }).eq('id', id);
    sendNotification(email, 'Role Request Denied', `Your request for role change was denied.`);
    fetchUsers();
  }

  const fetchShipments = useCallback(async () => {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('id', { ascending: false })
    
    if (error) console.error("Could not fetch data:", error.message)
    else setShipments(data || [])
  }, [])

  useEffect(() => {
    if (currentUser) {
      const loadInitialData = async () => { await fetchShipments() }
      loadInitialData()
    }
  }, [fetchShipments, currentUser])

  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel('realtime-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => { fetchShipments() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { fetchNotifications() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchShipments, fetchNotifications, currentUser])

  const handleStatusUpdate = useCallback(async (id, newStatus, senderEmail, skipPrompt = false) => {
    // NYTT: Optimistisk UI Uppdatering - Uppdaterar lokalt direkt innan databasen har svarat
    setShipments(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, status: newStatus }
      }
      return s;
    }));

    let updateData = { status: newStatus }
    let notificationMsg = '';

    if (newStatus === 'Picked Up') {
      updateData.picked_up_at = new Date().toISOString()
      updateData.picked_up_by = currentUser?.name || 'Logistics'
      notificationMsg = `Your package #${id} has been picked up by ${updateData.picked_up_by}.`;
    }

    if (newStatus === 'Booked') {
      const trackingNum = skipPrompt ? null : window.prompt("Enter tracking number (leave empty if not available):")
      if (trackingNum) updateData.tracking_id = trackingNum
      notificationMsg = trackingNum ? `Package #${id} is booked. Tracking: ${trackingNum}` : `Package #${id} is booked.`;
    }

    if (newStatus === 'Sent') {
      notificationMsg = `Package #${id} has been sent!`;
    }

    if (newStatus === 'Rejected') {
      const reason = window.prompt("Enter reason for rejection (Visible to sender):")
      if (!reason) {
        fetchShipments(); // Återställ UI om de avbryter
        return; 
      }
      
      const { data } = await supabase.from('shipments').select('comments').eq('id', id).single()
      const currentComments = data?.comments || ''
      const newCommentEntry = `[${new Date().toLocaleDateString('en-US')}] SYSTEM: Package rejected by Logistics. Reason: ${reason}`
      updateData.comments = currentComments ? `${currentComments}\n${newCommentEntry}` : newCommentEntry
      notificationMsg = `WARNING: Package #${id} was rejected by logistics. Please review.`;
    }

    if (newStatus === 'Resumed') {
      updateData.status = 'Waiting'
      const { data } = await supabase.from('shipments').select('comments').eq('id', id).single()
      const currentComments = data?.comments || ''
      const newCommentEntry = `[${new Date().toLocaleDateString('en-US')}] SYSTEM: Package marked as resolved by sender and is waiting for pickup.`
      updateData.comments = currentComments ? `${currentComments}\n${newCommentEntry}` : newCommentEntry
      
      sendNotification('logistics', `Package #${id} Resumed`, `Sender marked rejected package #${id} as resolved.`, id);
    }

    const { error } = await supabase.from('shipments').update(updateData).eq('id', id)
    if (error) {
      console.error("Could not update status:", error.message)
      fetchShipments(); // Återställ UI om det blir fel i databasen
    } else if (notificationMsg && senderEmail) {
      sendNotification(senderEmail, `Status Update: ${newStatus}`, notificationMsg, id);
    }
  }, [currentUser, fetchShipments])

  const handleAddComment = async (id, currentComments, targetEmail) => {
    if (!commentInput.trim() && !commentFile) return;
    
    let fileInfo = '';
    if (commentFile) {
      const fileName = `${Date.now()}_comment_${commentFile.name}`;
      const { error: uploadError } = await supabase.storage.from('package-docs').upload(fileName, commentFile);
      if (!uploadError) {
        const fileUrl = supabase.storage.from('package-docs').getPublicUrl(fileName).data.publicUrl;
        fileInfo = `\nAttached file to comment: ${fileUrl}`;
      } else {
        alert("Could not upload file to comment.");
      }
    }

    const newCommentEntry = `[${new Date().toLocaleDateString('en-US')}] ${currentUser.name}: ${commentInput} ${fileInfo}`;
    const updatedComments = currentComments ? `${currentComments}\n${newCommentEntry}` : newCommentEntry;

    const { error } = await supabase.from('shipments').update({ comments: updatedComments }).eq('id', id);
    
    if (!error) {
      const notifyEmail = currentUser.role === 'user' ? 'logistics' : targetEmail;
      sendNotification(notifyEmail, `New Comment on Package #${id}`, `${currentUser.name} added a comment.`, id);

      setCommentInput(''); 
      setCommentFile(null);
      const fileInput = document.getElementById(`comment-file-${id}`);
      if (fileInput) fileInput.value = '';
    }
  }

  // NYTT: Blixtsnabb, intelligent Bulk Scanner
  useEffect(() => {
    if (view === 'scanner') {
      scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 }, false)
      scannerRef.current.render((decodedText) => {
        const id = parseInt(decodedText, 10);
        if (isNaN(id)) return; 

        const now = Date.now();
        const lastScanned = lastScannedRef.current[id] || 0;
        
        // Förhindra dubbelscanning: ignorera om samma ID scannats de senaste 5 sekunderna
        if (now - lastScanned < 5000) return; 

        lastScannedRef.current[id] = now; // Uppdatera minnet för detta ID

        supabase.from('shipments').select('sender_email, status').eq('id', id).single().then(({data}) => {
          if (data && data.status !== 'Picked Up') {
            handleStatusUpdate(id, 'Picked Up', data.sender_email, true);
            setScanMessage(`Package #${id} picked up!`);
            setTimeout(() => setScanMessage(''), 3000); // Tar bort notisen efter 3 sek
          } else if (data && data.status === 'Picked Up') {
            setScanMessage(`Package #${id} is already Picked Up.`);
            setTimeout(() => setScanMessage(''), 3000);
          }
        });
      }, () => {})
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error(err))
        scannerRef.current = null 
      }
    }
  }, [view, handleStatusUpdate])

  useEffect(() => {
    if (searchScannerActive) {
      searchScannerRef.current = new Html5QrcodeScanner("search-reader", { fps: 10, qrbox: 250 }, false)
      searchScannerRef.current.render((decodedText) => {
        const id = parseInt(decodedText, 10);
        if (isNaN(id)) return;
        
        setSearchTerm(id.toString());
        setSearchScannerActive(false);
        setExpandedPkg(id); 
      }, () => {})
    }

    return () => {
      if (searchScannerRef.current) {
        searchScannerRef.current.clear().catch(err => console.error(err))
        searchScannerRef.current = null 
      }
    }
  }, [searchScannerActive])

  const removeSelectedFile = (indexToRemove) => {
    setForm(prev => ({
      ...prev,
      files: prev.files.filter((_, index) => index !== indexToRemove)
    }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    let fileDataToSave = ''

    try {
      if (form.files && form.files.length > 0) {
        const uploadedFiles = []
        for (let i = 0; i < form.files.length; i++) {
          const file = form.files[i]
          const fileName = `${Date.now()}_${i}_${file.name}` 
          const { error: uploadError } = await supabase.storage.from('package-docs').upload(fileName, file)
          if (uploadError) throw uploadError
          
          const fileUrl = supabase.storage.from('package-docs').getPublicUrl(fileName).data.publicUrl
          uploadedFiles.push({ name: file.name, url: fileUrl })
        }
        fileDataToSave = JSON.stringify(uploadedFiles)
      }

      const { data, error: insertError } = await supabase
        .from('shipments')
        .insert([{ 
          sender_name: currentUser.name, 
          sender_email: currentUser.email,
          location: form.loc, 
          destination_country: form.country,
          carrier: form.carrier,
          file_url: fileDataToSave,
          status: 'Waiting'
        }])
        .select()
      
      if (insertError) throw insertError
      
      if (data) { 
        setCreatedIds(prev => [data[0].id, ...prev]) 
        setForm({ ...form, loc: '', country: '', carrier: '', files: [] }) 
        document.getElementById('file-input').value = '' 

        sendNotification('logistics', `New Package Created`, `Package #${data[0].id} is waiting at ${data[0].location}.`, data[0].id);
      }
    } catch (err) {
      alert("Something went wrong: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const printLabel = (id) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Label</title>
          <script src="https://cdn.jsdelivr.net/npm/qrcode@1.4.4/build/qrcode.min.js"></script>
        </head>
        <body style="text-align:center; font-family:sans-serif; padding:40px;">
          <div style="border: 3px solid #000; padding: 20px; display: inline-block;">
            <h1 style="font-size: 40px; margin-bottom: 10px;">PACKAGE #${id}</h1>
            <div style="display:flex; justify-content:center; margin: 20px 0;">
              <canvas id="qrCanvas"></canvas>
            </div>
            <p style="font-size: 20px; font-weight: bold;">Logistics ID</p>
          </div>
          <script>
            window.onload = function() {
              QRCode.toCanvas(document.getElementById('qrCanvas'), '${id}', { width: 250 }, function (error) {
                if (error) console.error(error);
                setTimeout(() => window.print(), 500); 
              });
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const uniqueLocations = useMemo(() => {
    const locs = shipments.map(s => s.location).filter(Boolean);
    return ['All', ...new Set(locs)];
  }, [shipments]);

  const processedShipments = useMemo(() => {
    let result = shipments;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(s => 
        s.id.toString().includes(lowerTerm) || 
        (s.location && s.location.toLowerCase().includes(lowerTerm)) ||
        (s.sender_name && s.sender_name.toLowerCase().includes(lowerTerm)) ||
        (s.tracking_id && s.tracking_id.toLowerCase().includes(lowerTerm))
      );
    }
    if (filterStatus !== 'All') result = result.filter(s => s.status === filterStatus);
    if (filterLocation !== 'All') result = result.filter(s => s.location === filterLocation);
    if (sortBy === 'oldest') result = [...result].sort((a, b) => a.id - b.id);
    else result = [...result].sort((a, b) => b.id - a.id); 
    return result;
  }, [shipments, searchTerm, filterStatus, filterLocation, sortBy]);

  const myShipments = shipments.filter(s => 
    s.sender_email && currentUser?.email && 
    s.sender_email.toLowerCase() === currentUser.email.toLowerCase()
  )

  const statsShipments = useMemo(() => {
    if (!startDate && !endDate) return shipments;
    
    return shipments.filter(s => {
      const createdDate = parseISO(s.created_at);
      const start = startDate ? startOfDay(parseISO(startDate)) : new Date('2000-01-01');
      const end = endDate ? endOfDay(parseISO(endDate)) : new Date('2100-01-01');
      return isWithinInterval(createdDate, { start, end });
    });
  }, [shipments, startDate, endDate]);

  const statsLoc = statsShipments.reduce((acc, s) => {
    acc[s.location] = (acc[s.location] || 0) + 1
    return acc
  }, {})

  const chartDataLoc = Object.entries(statsLoc).map(([name, count]) => ({ name, Count: count }));
  
  const chartDataStatus = [
    { name: 'Waiting', value: statsShipments.filter(s => s.status === 'Waiting').length, color: '#ecc94b' },
    { name: 'Picked Up', value: statsShipments.filter(s => s.status === 'Picked Up').length, color: '#4299e1' },
    { name: 'Booked', value: statsShipments.filter(s => s.status === 'Booked').length, color: '#ed8936' },
    { name: 'Sent', value: statsShipments.filter(s => s.status === 'Sent').length, color: '#48bb78' },
    { name: 'Rejected', value: statsShipments.filter(s => s.status === 'Rejected').length, color: '#e53e3e' } 
  ].filter(d => d.value > 0);

  const calculateLeadTime = () => {
    const pickedUp = statsShipments.filter(s => s.picked_up_at && s.created_at);
    if (pickedUp.length === 0) return "N/A";
    const totalMs = pickedUp.reduce((sum, s) => sum + (new Date(s.picked_up_at) - new Date(s.created_at)), 0);
    const avgMs = totalMs / pickedUp.length;
    const avgHours = Math.round(avgMs / (1000 * 60 * 60));
    return avgHours < 1 ? `${Math.round(avgMs / (1000 * 60))} min` : `${avgHours} hours`;
  }

  const exportToExcel = () => {
    const headers = ['ID', 'Created Date', 'Sender', 'Email', 'Pickup Location', 'Destination Country', 'Carrier', 'Status', 'Tracking Number', 'Picked Up Date', 'Picked Up By', 'Comments'];
    const csvRows = [headers.join(';')];
    
    statsShipments.forEach(s => {
      const row = [
        s.id,
        s.created_at ? new Date(s.created_at).toLocaleString('en-US') : '',
        `"${s.sender_name || ''}"`,
        `"${s.sender_email || ''}"`,
        `"${s.location || ''}"`,
        `"${s.destination_country || ''}"`,
        `"${s.carrier || ''}"`,
        s.status,
        `"${s.tracking_id || ''}"`,
        s.picked_up_at ? new Date(s.picked_up_at).toLocaleString('en-US') : '',
        `"${s.picked_up_by || ''}"`,
        `"${(s.comments || '').replace(/\n/g, ' ')}"`
      ];
      csvRows.push(row.join(';'));
    });

    const csvContent = "\uFEFF" + csvRows.join('\n'); 
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `logistics_stats_${new Date().toLocaleDateString('en-US')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const renderExpandedContent = (s, attachedFiles, isSenderView = false) => (
    <div style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid #e2e8f0', fontSize: '14px'}} onClick={e => e.stopPropagation()}>
      
      {isSenderView && s.status === 'Rejected' && (
        <div style={{background: '#fed7d7', padding: '15px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #fc8181'}}>
          <strong style={{color: '#c53030', fontSize: '16px'}}>Package rejected!</strong>
          <p style={{fontSize: '13px', margin: '5px 0 10px 0', color: '#742a2a'}}>Read the comments from logistics below, resolve the issue (you can attach missing documents directly in a new comment), and then click the button to resubmit.</p>
          <button onClick={() => handleStatusUpdate(s.id, 'Resumed', s.sender_email)} style={{...smallBtn, background: '#38a169', width: '100%', padding: '10px'}}>
            Mark as resolved & Resubmit
          </button>
        </div>
      )}

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px', background: '#f7fafc', padding: '10px', borderRadius: '8px'}}>
        <div>
          <p style={{margin: '0 0 5px 0'}}><strong>Pickup Location:</strong> {s.location}</p>
          {s.destination_country && <p style={{margin: '0 0 5px 0'}}><strong>Country:</strong> {s.destination_country}</p>}
          <p style={{margin: '0 0 5px 0', color: '#718096'}}><strong>Created:</strong> {new Date(s.created_at).toLocaleString('en-US', {dateStyle: 'short', timeStyle: 'short'})}</p>
        </div>
        <div>
          {s.carrier && <p style={{margin: '0 0 5px 0'}}><strong>Carrier:</strong> {s.carrier}</p>}
          {s.tracking_id && <p style={{margin: '0 0 5px 0', color: '#2b6cb0'}}><strong>Tracking:</strong> {s.tracking_id}</p>}
          {s.picked_up_by && <p style={{margin: '0 0 5px 0', color: '#38a169'}}><strong>Picked up by:</strong> {s.picked_up_by}</p>}
        </div>
      </div>
      
      {attachedFiles.length > 0 && (
        <div style={{marginBottom: '15px'}}>
          <strong>Initial Files:</strong>
          <div style={{display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '5px'}}>
            {attachedFiles.map((f, i) => (
              <a key={i} href={f.url} target="_blank" rel="noreferrer" style={fileLink}>
                {f.name}
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{background: '#fff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0'}}>
        <strong>Chat & Comments:</strong>
        {s.comments ? (
           <div style={{whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '13px', color: '#4a5568', margin: '10px 0', wordBreak: 'break-word'}}>
             {s.comments.split(/(https?:\/\/[^\s]+)/g).map((part, i) => 
                part.match(/https?:\/\//) 
                  ? <a key={i} href={part} target="_blank" rel="noreferrer" style={{color: '#3182ce', textDecoration: 'underline'}}>Open attached link</a> 
                  : part
             )}
           </div>
        ) : (
          <p style={{fontSize: '12px', color: '#a0aec0', fontStyle: 'italic', margin: '5px 0 10px 0'}}>No comments yet.</p>
        )}
        
        <div style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0'}}>
          <div style={{display: 'flex', gap: '5px'}}>
            <input 
              type="text" 
              placeholder="Write a message..." 
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              style={{...inputStyle, marginBottom: 0, flex: 1, padding: '8px'}}
            />
            <button onClick={() => handleAddComment(s.id, s.comments, s.sender_email)} style={{...smallBtn, background: '#3182ce', padding: '8px 12px'}}>
              Send
            </button>
          </div>
          <div style={{fontSize: '12px', color: '#4a5568'}}>
            Attach file to comment (optional): 
            <input id={`comment-file-${s.id}`} type="file" onChange={e => setCommentFile(e.target.files[0])} style={{fontSize: '11px', marginTop: '5px'}} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!currentUser) {
    return (
      <div style={{...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
        <div style={{...cardStyle, width: '100%', maxWidth: '400px'}}>
          <h1 style={{textAlign: 'center', fontWeight: '800'}}>
            {authMode === 'login' ? 'Log In' : authMode === 'register' ? 'Create Account' : 'Reset Password'}
          </h1>
          <p style={{textAlign: 'center', fontSize: '14px', color: '#718096', marginBottom: '25px'}}>Höganäs Logistics Portal</p>
          
          {authError && <div style={{background: '#fed7d7', color: '#c53030', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '13px'}}>{authError}</div>}
          
          <form onSubmit={
            authMode === 'login' ? handleLogin : 
            authMode === 'register' ? handleRegister : 
            handleForgotPassword
          }>
            {authMode === 'register' && (
              <input 
                placeholder="Full Name" 
                value={authName} 
                onChange={e => setAuthName(e.target.value)} 
                required style={inputStyle} 
              />
            )}
            <input 
              type="email" 
              placeholder="Email (@hoganas.com)" 
              value={authEmail} 
              onChange={e => setAuthEmail(e.target.value)} 
              required style={inputStyle} 
            />
            {authMode !== 'forgot' && (
              <input 
                type="password" 
                placeholder="Password" 
                value={authPassword} 
                onChange={e => setAuthPassword(e.target.value)} 
                required style={inputStyle} 
              />
            )}
            <button type="submit" disabled={loading} style={{...btnStyle, marginBottom: '15px'}}>
              {loading ? 'Processing...' : (authMode === 'login' ? 'Log In' : authMode === 'register' ? 'Sign Up' : 'Request Reset')}
            </button>
          </form>
          
          <div style={{textAlign: 'center', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            {authMode === 'login' && (
              <span onClick={() => setAuthMode('forgot')} style={{color: '#e53e3e', cursor: 'pointer', fontWeight: 'bold'}}>Forgot Password?</span>
            )}
            {authMode === 'login' ? (
              <span>No account? <span onClick={() => setAuthMode('register')} style={{color: '#3182ce', cursor: 'pointer', fontWeight: 'bold'}}>Request one here</span></span>
            ) : (
              <span>Back to <span onClick={() => setAuthMode('login')} style={{color: '#3182ce', cursor: 'pointer', fontWeight: 'bold'}}>Log in</span></span>
            )}
          </div>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={containerStyle}>
      
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
        <div style={{fontSize: '22px', fontWeight: '800', letterSpacing: '-0.02em', color: '#1e293b'}}>Höganäs Logistics</div>
        
        <div style={{position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center'}} onClick={() => setView('notifications')}>
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: 'white', 
              borderRadius: '50%', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', 
              justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', border: '2px solid #f8fafc'
            }}>
              {unreadCount}
            </div>
          )}
        </div>
      </div>

      <nav style={navStyle}>
        <button onClick={() => setView('user')} style={view === 'user' ? activeNavBtn : navBtn}>Sender</button>
        
        {['logistics', 'admin'].includes(currentUser.role) && (
          <>
            <button onClick={() => setView('logistics')} style={view === 'logistics' ? activeNavBtn : navBtn}>Logistics</button>
            <button onClick={() => setView('stats')} style={view === 'stats' ? activeNavBtn : navBtn}>Dashboard</button>
            <button onClick={() => setView('scanner')} style={view === 'scanner' ? activeNavBtn : navBtn}>Bulk Scan</button>
          </>
        )}
        
        <button onClick={() => setView('profile')} style={view === 'profile' ? activeNavBtn : navBtn}>Profile</button>
        {currentUser.role === 'admin' && (
          <button onClick={() => setView('admin')} style={view === 'admin' ? activeNavBtn : navBtn}>Admin</button>
        )}

        <button onClick={handleLogout} style={{...navBtn, background: '#e2e8f0', color: '#4a5568', flex: '0.5'}}>Log Out</button>
      </nav>

      {/* --- NOTIFICATIONS VIEW --- */}
      {view === 'notifications' && (
        <section>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '15px' }}>
            <h1 style={{ margin: 0 }}>Notifications</h1>
            {unreadCount > 0 && (
              <div style={{ position: 'absolute', right: 0 }}>
                <button onClick={markAllAsRead} style={{...smallBtn, background: '#718096'}}>Mark all as read</button>
              </div>
            )}
          </div>
          
          {notifications.length === 0 ? (
            <p>You have no notifications.</p>
          ) : (
            <div style={cardStyle}>
              {notifications.map(notif => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    padding: '16px', 
                    borderBottom: '1px solid #e2e8f0', 
                    background: notif.is_read ? 'transparent' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <strong style={{color: notif.is_read ? '#4a5568' : '#2b6cb0'}}>{notif.title}</strong>
                    <span style={{fontSize: '11px', color: '#a0aec0'}}>{new Date(notif.created_at).toLocaleString('en-US', {dateStyle: 'short', timeStyle: 'short'})}</span>
                  </div>
                  <p style={{margin: '6px 0 0 0', fontSize: '14px', color: '#4a5568', lineHeight: '1.4'}}>{notif.message}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* --- PROFILE VIEW --- */}
      {view === 'profile' && (
        <section>
          <h1>User Profile</h1>
          <div style={cardStyle}>
            <h3 style={{marginTop: 0}}>Account Details</h3>
            <p><strong>Name:</strong> {currentUser.name}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p style={{marginBottom: '20px'}}>
              <strong>Current Role:</strong> <span style={{textTransform: 'capitalize', color: '#3182ce', fontWeight: 'bold'}}>{currentUser.role}</span>
            </p>

            <hr style={{border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0'}} />

            <h3 style={{marginTop: 0}}>Change Password</h3>
            <form onSubmit={handleUpdatePassword} style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px'}}>
              <input 
                type="password" 
                placeholder="New Password" 
                value={profilePassword} 
                onChange={e => setProfilePassword(e.target.value)} 
                required 
                style={{...inputStyle, marginBottom: 0, flex: 1, minWidth: '200px'}} 
              />
              <input 
                type="password" 
                placeholder="Confirm New Password" 
                value={profileConfirmPassword} 
                onChange={e => setProfileConfirmPassword(e.target.value)} 
                required 
                style={{...inputStyle, marginBottom: 0, flex: 1, minWidth: '200px'}} 
              />
              <button type="submit" disabled={loading} style={{...btnStyle, width: 'auto', padding: '0 20px'}}>Update</button>
            </form>

            <hr style={{border: 'none', borderTop: '1px solid #e2e8f0', margin: '20px 0'}} />

            <h3 style={{marginTop: 0}}>Request Role Change</h3>
            <p style={{fontSize: '13px', color: '#718096'}}>Need Logistics or Admin access? Submit a request to the system administrators. Include your manager's name and reason.</p>
            <form onSubmit={handleRoleRequest}>
              <select value={profileReqRole} onChange={e => setProfileReqRole(e.target.value)} style={selectStyle}>
                <option value="logistics">Logistics Role</option>
                <option value="admin">Admin Role</option>
              </select>
              <input 
                placeholder="Manager's name & Reason for request..." 
                value={profileReqComment} 
                onChange={e => setProfileReqComment(e.target.value)} 
                required 
                style={{...inputStyle, marginTop: '10px'}} 
              />
              <button type="submit" disabled={loading} style={{...btnStyle, background: '#4a5568'}}>Submit Request</button>
            </form>
          </div>
        </section>
      )}

      {/* --- SENDER VIEW --- */}
      {view === 'user' && (
        <section>
          <h1>Book Shipment</h1>
          <form onSubmit={handleCreate} style={cardStyle}>
            <input 
              value={form.name} 
              readOnly
              style={{...inputStyle, background: '#edf2f7', color: '#718096'}} 
              title="Assigned by account"
            />
            <input 
              value={form.email} 
              readOnly
              style={{...inputStyle, background: '#edf2f7', color: '#718096'}} 
              title="Assigned by account"
            />
            <input 
              placeholder="Pickup Location (e.g., C-lab)" 
              value={form.loc} 
              onChange={e => setForm({...form, loc: e.target.value})} 
              required style={inputStyle} 
            />
            <div style={{display: 'flex', gap: '10px'}}>
              <input 
                placeholder="Destination Country" 
                value={form.country} 
                onChange={e => setForm({...form, country: e.target.value})} 
                required style={{...inputStyle, flex: 1}} 
              />
              <input 
                placeholder="Carrier (e.g., DHL)" 
                value={form.carrier} 
                onChange={e => setForm({...form, carrier: e.target.value})} 
                required style={{...inputStyle, flex: 1}} 
              />
            </div>
            
            <label style={{display: 'block', marginBottom: '10px', fontSize: '14px', fontWeight: '500'}}>
              Attach documents (Select multiple, or click again to add more):
              <input 
                id="file-input"
                type="file" 
                multiple 
                onChange={e => {
                  if (e.target.files) {
                    const newFiles = Array.from(e.target.files)
                    setForm(prev => ({...prev, files: [...prev.files, ...newFiles]}))
                    e.target.value = ''
                  }
                }} 
                style={{marginTop: '8px', display: 'block'}} 
              />
            </label>

            {form.files.length > 0 && (
              <div style={{marginBottom: '15px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                <div style={{fontSize: '13px', fontWeight: '600', color: '#475569'}}>Files to be attached:</div>
                <ul style={{margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#334155'}}>
                  {form.files.map((file, idx) => (
                    <li key={idx} style={{marginBottom: '6px'}}>
                      {file.name}
                      <button 
                        type="button" 
                        onClick={() => removeSelectedFile(idx)} 
                        style={{marginLeft: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '12px'}}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'Processing...' : 'Create Package & Generate ID'}
            </button>
          </form>

          {createdIds.length > 0 && (
            <div style={receiptStyle}>
              <h3 style={{margin: '0 0 15px 0', color: '#047857'}}>Newly created packages:</h3>
              {createdIds.map(id => (
                <div key={id} style={{marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #a7f3d0'}}>
                  <h1 style={{fontSize: '42px', margin: '10px 0', color: '#065f46'}}>#{id}</h1>
                  <div style={{display: 'flex', justifyContent: 'center'}}>
                    <QRCodeSVG value={id.toString()} size={110} />
                  </div>
                  <br />
                  <button onClick={() => printLabel(id)} style={printBtn}>Print Label for #{id}</button>
                </div>
              ))}
            </div>
          )}

          {myShipments.length > 0 && (
            <div style={{marginTop: '40px'}}>
              <h2>My Packages ({currentUser.name})</h2>
              {myShipments.map(s => {
                const isExpanded = expandedPkg === s.id;
                const attachedFiles = getFiles(s.file_url);
                const borderColor = s.status === 'Rejected' ? '#ef4444' : 'transparent';
                
                return (
                  <div 
                    key={s.id} 
                    style={{...shipmentCard, flexDirection: 'column', alignItems: 'stretch', border: `1px solid ${borderColor === 'transparent' ? '#e2e8f0' : borderColor}`}}
                    onClick={() => { setExpandedPkg(isExpanded ? null : s.id); setCommentInput(''); setCommentFile(null); }}
                  >
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div><strong style={{fontSize: '16px'}}>#{s.id}</strong> - <span style={statusBadge(s.status)}>{s.status}</span></div>
                      <div style={{color: '#64748b', fontSize: '13px', fontWeight: '500'}}>{isExpanded ? 'Hide Details' : 'Show Details'}</div>
                    </div>
                    
                    {isExpanded && renderExpandedContent(s, attachedFiles, true)}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* --- LOGISTICS VIEW --- */}
      {view === 'logistics' && (
        <section>
          <h1>Logistics Overview</h1>
          
          <div style={{...cardStyle, padding: '20px'}}>
            
            <div style={{display: 'flex', gap: '8px', marginBottom: '16px'}}>
              <input 
                placeholder="Search ID, Name, Tracking..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={{...inputStyle, border: '2px solid #cbd5e1', marginBottom: 0, flex: 1}} 
              />
              <button 
                onClick={() => setSearchScannerActive(!searchScannerActive)}
                style={{...smallBtn, background: searchScannerActive ? '#ef4444' : '#0f172a', padding: '0 20px', fontSize: '14px'}}
              >
                {searchScannerActive ? 'Cancel Scan' : 'Scan to Find'}
              </button>
            </div>

            {searchScannerActive && (
               <div style={{background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)'}}>
                 <div id="search-reader" style={{ width: '100%' }}></div>
               </div>
            )}
            
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px'}}>
              <div>
                <label style={filterLabelStyle}>Status Filter</label>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                  <option value="All">All Statuses</option>
                  <option value="Waiting">Waiting (To be picked up)</option>
                  <option value="Picked Up">Picked Up (At warehouse)</option>
                  <option value="Booked">Booked (Awaiting carrier)</option>
                  <option value="Sent">Sent</option>
                  <option value="Rejected">Rejected (Requires action)</option>
                </select>
              </div>
              <div>
                <label style={filterLabelStyle}>Location Filter</label>
                <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} style={selectStyle}>
                  {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              </div>
              <div>
                <label style={filterLabelStyle}>Sort Order</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selectStyle}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>
            </div>
          </div>
          
          <div style={{marginBottom: '16px', fontSize: '14px', fontWeight: '600', color: '#64748b', display: 'flex', justifyContent: 'space-between', padding: '0 4px'}}>
            <span>Showing {processedShipments.length} packages</span>
            <span style={{color: '#ef4444'}}>{shipments.filter(s => s.status === 'Waiting').length} waiting total</span>
          </div>

          {processedShipments.length === 0 && <div style={{textAlign: 'center', padding: '40px', color: '#94a3b8'}}>No packages match the current filters.</div>}
          
          {processedShipments.map(s => {
            const isExpanded = expandedPkg === s.id;
            const attachedFiles = getFiles(s.file_url);
            
            let borderCol = '#fbbf24'; 
            if (s.status === 'Picked Up') borderCol = '#60a5fa'; 
            else if (s.status === 'Booked') borderCol = '#fb923c'; 
            else if (s.status === 'Sent') borderCol = '#34d399'; 
            else if (s.status === 'Rejected') borderCol = '#f87171'; 

            return (
              <div 
                key={s.id} 
                style={{...shipmentCard, flexDirection: 'column', alignItems: 'stretch', borderLeft: `6px solid ${borderCol}`, cursor: 'pointer'}}
                onClick={() => { setExpandedPkg(isExpanded ? null : s.id); setCommentInput(''); setCommentFile(null); }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{flex: 1}}>
                    <div style={{fontWeight: '700', fontSize: '17px', color: '#1e293b'}}>
                      #{s.id} - {s.location}
                      {s.comments && <span style={{fontSize:'12px', marginLeft:'8px', color: '#3b82f6', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px'}} title="Has comments">Commented</span>}
                    </div>
                    <div style={{fontSize: '13px', color: '#64748b', marginTop: '4px'}}>
                      {s.sender_name} {s.sender_email ? `(${s.sender_email})` : ''} <span style={{margin: '0 8px', color: '#cbd5e1'}}>|</span> <span style={statusBadge(s.status)}>{s.status}</span>
                    </div>
                  </div>

                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end'}}>
                    <div style={{display: 'flex', gap: '6px'}} onClick={e => e.stopPropagation()}>
                      {s.status === 'Waiting' && <button onClick={() => handleStatusUpdate(s.id, 'Rejected', s.sender_email)} style={{...smallBtn, background: '#ef4444'}}>Reject</button>}
                      {s.status === 'Waiting' && <button onClick={() => handleStatusUpdate(s.id, 'Picked Up', s.sender_email)} style={smallBtn}>Pick Up</button>}
                      
                      {s.status === 'Picked Up' && <button onClick={() => handleStatusUpdate(s.id, 'Booked', s.sender_email)} style={{...smallBtn, background: '#ea580c'}}>Book</button>}
                      {s.status === 'Booked' && <button onClick={() => handleStatusUpdate(s.id, 'Sent', s.sender_email)} style={{...smallBtn, background: '#16a34a'}}>Send</button>}
                    </div>
                    <div style={{color: '#94a3b8', fontSize: '12px', fontWeight: '500'}}>{isExpanded ? 'Hide Details' : 'Show Details'}</div>
                  </div>
                </div>
                
                {isExpanded && renderExpandedContent(s, attachedFiles)}
              </div>
            )
          })}
        </section>
      )}

      {/* --- ADMIN VIEW --- */}
      {view === 'admin' && currentUser?.role === 'admin' && (
        <section>
          <h1>Administration</h1>
          <p style={{fontSize: '14px', color: '#64748b', marginBottom: '24px'}}>Manage users, approvals, and system roles.</p>
          
          <div style={{...cardStyle, padding: '0', overflow: 'hidden'}}>
            {allUsers.length === 0 ? <p style={{padding: '20px'}}>Loading users...</p> : (
              <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', minWidth: '600px', textAlign: 'left', fontSize: '14px', borderCollapse: 'collapse'}}>
                  <thead>
                    <tr style={{background: '#f8fafc', borderBottom: '1px solid #e2e8f0'}}>
                      <th style={{padding: '16px 20px', color: '#475569', fontWeight: '600'}}>User Details</th>
                      <th style={{padding: '16px 20px', color: '#475569', fontWeight: '600'}}>Access Status</th>
                      <th style={{padding: '16px 20px', color: '#475569', fontWeight: '600'}}>System Role</th>
                      <th style={{padding: '16px 20px', color: '#475569', fontWeight: '600'}}>Alerts & Requests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allUsers.map((u, index) => (
                      <tr key={u.id} style={{borderBottom: index === allUsers.length - 1 ? 'none' : '1px solid #e2e8f0', background: '#fff'}}>
                        <td style={{padding: '16px 20px', verticalAlign: 'top'}}>
                          <strong style={{color: '#1e293b'}}>{u.name}</strong><br />
                          <span style={{color: '#64748b', fontSize: '13px'}}>{u.email}</span>
                        </td>
                        <td style={{padding: '16px 20px', verticalAlign: 'top'}}>
                          <button 
                            onClick={() => toggleUserApproval(u.id, u.is_approved)}
                            style={{
                              ...smallBtn, 
                              background: u.is_approved ? '#10b981' : '#ef4444',
                              padding: '6px 12px',
                              boxShadow: 'none'
                            }}
                          >
                            {u.is_approved ? 'Approved' : 'Pending'}
                          </button>
                        </td>
                        <td style={{padding: '16px 20px', verticalAlign: 'top'}}>
                          {u.email === 'admin@hoganas.com' ? (
                            <span style={{fontWeight: '700', color: '#4f46e5', background: '#e0e7ff', padding: '4px 10px', borderRadius: '6px', fontSize: '12px'}}>Super Admin</span>
                          ) : (
                            <select 
                              value={u.role} 
                              onChange={(e) => changeUserRole(u.id, e.target.value)}
                              style={{...selectStyle, padding: '6px 10px', width: 'auto', background: '#f8fafc', border: '1px solid #cbd5e1'}}
                            >
                              <option value="user">User</option>
                              <option value="logistics">Logistics</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </td>
                        <td style={{padding: '16px 20px', verticalAlign: 'top'}}>
                          {u.password_reset_requested && (
                            <div style={{marginBottom: '8px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px'}}>
                              <strong style={{color: '#991b1b', fontSize: '13px', display: 'block', marginBottom: '8px'}}>Reset Requested</strong>
                              <input 
                                type="text" 
                                placeholder="Set new password..." 
                                value={adminPassInputs[u.id] || ''} 
                                onChange={e => setAdminPassInputs({...adminPassInputs, [u.id]: e.target.value})} 
                                style={{...inputStyle, padding: '8px', margin: '0 0 8px 0', fontSize: '13px'}} 
                              />
                              <button onClick={() => handleAdminResetPassword(u.id)} style={{...smallBtn, background: '#dc2626', width: '100%'}}>Save Password</button>
                            </div>
                          )}
                          {u.requested_role && (
                            <div style={{padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px'}}>
                              <strong style={{color: '#9a3412', fontSize: '13px', display: 'block'}}>Role Request: <span style={{textTransform: 'capitalize'}}>{u.requested_role}</span></strong>
                              <span style={{fontStyle: 'italic', display: 'block', margin: '8px 0', color: '#78350f', fontSize: '13px', background: 'rgba(255,255,255,0.5)', padding: '6px', borderRadius: '4px'}}>"{u.role_request_comment}"</span>
                              <div style={{display: 'flex', gap: '6px'}}>
                                <button onClick={() => handleApproveRole(u.id, u.requested_role, u.email)} style={{...smallBtn, background: '#10b981', flex: 1}}>Approve</button>
                                <button onClick={() => handleDenyRole(u.id, u.email)} style={{...smallBtn, background: '#64748b', flex: 1}}>Deny</button>
                              </div>
                            </div>
                          )}
                          {!u.password_reset_requested && !u.requested_role && (
                            <span style={{color: '#94a3b8', fontSize: '13px', fontStyle: 'italic'}}>No active requests</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* --- STATS VIEW --- */}
      {view === 'stats' && (
        <section>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
            <h1 style={{ margin: 0, textAlign: 'center' }}>Dashboard Overview</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', alignItems: 'center', background: '#fff', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px -4px rgba(15,23,42,0.1)' }}>
              <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px'}}>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={{...inputStyle, marginBottom: 0, padding: '8px 12px', fontSize: '13px', width: 'auto'}} 
                />
                <span style={{color: '#64748b', fontSize: '13px', fontWeight: '500'}}>to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={{...inputStyle, marginBottom: 0, padding: '8px 12px', fontSize: '13px', width: 'auto'}} 
                />
                {(startDate || endDate) && (
                  <button onClick={() => { setStartDate(''); setEndDate(''); }} style={{...smallBtn, background: '#e2e8f0', color: '#475569', padding: '8px 12px', boxShadow: 'none'}}>Clear</button>
                )}
              </div>
              <div style={{width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px'}}></div>
              <button onClick={exportToExcel} style={{...smallBtn, background: '#10b981', padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap'}}>
                Export CSV
              </button>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '24px'}}>
            <div style={{...cardStyle, textAlign: 'center', padding: '24px 16px', marginBottom: 0}}>
              <div style={{fontSize: '36px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em'}}>{statsShipments.length}</div>
              <div style={{fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px'}}>Total Packages</div>
            </div>
            <div style={{...cardStyle, textAlign: 'center', padding: '24px 16px', borderColor: '#fcd34d', marginBottom: 0}}>
              <div style={{fontSize: '36px', fontWeight: '800', color: '#d97706', letterSpacing: '-0.02em'}}>{statsShipments.filter(s=>s.status==='Waiting').length}</div>
              <div style={{fontSize: '12px', color: '#92400e', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px'}}>Waiting Pickup</div>
            </div>
            <div style={{...cardStyle, textAlign: 'center', padding: '24px 16px', marginBottom: 0}}>
              <div style={{fontSize: '36px', fontWeight: '800', color: '#059669', letterSpacing: '-0.02em'}}>{calculateLeadTime()}</div>
              <div style={{fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px'}}>Avg Lead Time</div>
            </div>
          </div>

          <div style={{...cardStyle, marginBottom: '24px', height: '320px', padding: '24px'}}>
            <h3 style={{marginTop: 0, color: '#1e293b', fontSize: '16px'}}>Status Distribution</h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartDataStatus} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({name, value}) => `${name}: ${value}`} labelLine={false}>
                  {chartDataStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{...cardStyle, height: '360px', padding: '24px'}}>
            <h3 style={{marginTop: 0, color: '#1e293b', fontSize: '16px'}}>Volume per Location</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataLoc} margin={{ top: 10, right: 0, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={{stroke: '#e2e8f0'}} tickLine={false} />
                <YAxis allowDecimals={false} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="Count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* --- SCANNER VIEW (BULK) --- */}
      {view === 'scanner' && (
        <section>
          <h1>Bulk Scanner</h1>
          {scanMessage && (
            <div style={{background: '#10b981', color: 'white', padding: '10px 15px', borderRadius: '8px', marginBottom: '16px', fontWeight: '600', boxShadow: '0 4px 6px rgba(16,185,129,0.2)'}}>
              {scanMessage}
            </div>
          )}
          <p style={{fontSize: '15px', color: '#475569', marginBottom: '24px'}}>Scan packages consecutively. They will automatically be marked as "Picked Up" in the system.</p>
          <div style={{background: '#0f172a', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px', padding: '8px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)'}}>
            <div id="reader" style={{ width: '100%', borderRadius: '10px', overflow: 'hidden' }}></div>
          </div>
          <button onClick={() => setView('logistics')} style={{...cancelBtn, background: '#f1f5f9', border: 'none'}}>Finish & Return</button>
        </section>
      )}
    </div>
  )
}

export default App