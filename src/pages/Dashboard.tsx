import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LogOut, UploadCloud, Download, Loader2, 
  Search, FileText, Trash2, Edit2, Check, X,
  HardDrive, Plus, Folder, Clock, Star, Filter,
  Image as ImageIcon, FileCode, MoreVertical, FolderPlus, ChevronRight, AlertTriangle, RotateCcw,
  FileSpreadsheet, FileArchive, FileAudio, FileVideo, LayoutGrid, Settings2, Moon, Sun, Printer,
  Users, Shield, UserCheck, Lock, Menu
} from 'lucide-react';
import { getDefaultTeam, getTeamRole, getTeamMembers } from '../lib/teams';
import { 
  uploadDocument, getTeamFiles, getSignedDownloadUrl, UploadedFileRecord, 
  saveDocumentContent, searchDocuments, SearchResult, deleteDocument, 
  updateDocumentName, getFolders, createFolder, deleteFolder, FolderRecord,
  archiveFolder, archiveDocument, getArchiveFolder, restoreFolder, restoreDocument,
  getRecentFiles, getStarredFiles, getStarredFolders, moveFolder, moveDocument
} from '../lib/storage';
import { extractTextFromFile } from '../lib/parser';
import { SidebarFolderTree } from '../components/SidebarFolderTree';
import { AdminPanel } from '../components/AdminPanel';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [files, setFiles] = useState<UploadedFileRecord[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{id: string, name: string}[]>([]);
  const [starredItems, setStarredItems] = useState<{files: string[], folders: string[]}>(() => {
    const saved = localStorage.getItem('starredItems');
    return saved ? JSON.parse(saved) : { files: [], folders: [] };
  });

  useEffect(() => {
    localStorage.setItem('starredItems', JSON.stringify(starredItems));
  }, [starredItems]);

  useEffect(() => {
    if (folderPath.length > 0 && folderPath[0].name === '.starred') {
      setFiles(prev => prev.filter(f => starredItems.files.includes(f.id)));
      setFolders(prev => prev.filter(f => starredItems.folders.includes(f.id)));
    }
  }, [starredItems.files, starredItems.folders]);
  
  const [uploading, setUploading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [showUploadPanel, setShowUploadPanel] = useState(true);
  const [isPrivateUpload, setIsPrivateUpload] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Folder creation state
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<FolderRecord | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [searchFilters, setSearchFilters] = useState({
    fileType: 'all',
    dateModified: 'any',
    owner: 'anyone'
  });
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentSearches');
    return saved ? JSON.parse(saved) : [];
  });
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  const handleSearchSubmit = (query: string) => {
    if (!query.trim()) return;
    setSearchQuery(query);
    setShowSearchSuggestions(false);
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q !== query);
      return [query, ...filtered].slice(0, 5);
    });
  };

  const filteredSuggestions = recentSearches.filter(q => 
    q.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Rename and Delete state
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<UploadedFileRecord | null>(null);
  const [isDraggingOverUpload, setIsDraggingOverUpload] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Preview state
  const [previewFile, setPreviewFile] = useState<UploadedFileRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // PDF Preview state
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);

  // Column configuration state
  const [columns, setColumns] = useState({
    owner: true,
    lastModified: true,
    size: true
  });
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ type: 'file' | 'folder', id: string } | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState(false);

  const triggerFileUpload = () => {
    setShowUploadPanel(true);
    // Use a small timeout to ensure the panel is rendered before clicking the input
    setTimeout(() => {
      const fileInput = document.getElementById('file-upload');
      if (fileInput) {
        (fileInput as HTMLInputElement).click();
      }
    }, 100);
  };

  const handleDragStart = (e: React.DragEvent, type: 'file' | 'folder', id: string) => {
    if (!canEdit) {
      e.preventDefault();
      return;
    }
    setDraggedItem({ type, id });
    e.dataTransfer.setData('text/plain', `${type}:${id}`);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    if (!canEdit || !draggedItem) return;
    
    // Don't allow dropping a folder into itself
    if (draggedItem.type === 'folder' && draggedItem.id === folderId) return;
    
    e.dataTransfer.dropEffect = 'move';
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    
    if (!canEdit || !draggedItem || !teamId) return;
    
    // Prevent dropping into same folder
    if (draggedItem.type === 'folder' && draggedItem.id === targetFolderId) return;
    if (targetFolderId === currentFolderId) return; // Already in this folder

    setMovingItem(true);
    try {
      if (draggedItem.type === 'file') {
        await moveDocument(draggedItem.id, targetFolderId);
        setFiles(prev => prev.filter(f => f.id !== draggedItem.id));
      } else {
        await moveFolder(draggedItem.id, targetFolderId);
        setFolders(prev => prev.filter(f => f.id !== draggedItem.id));
        setRefreshSidebar(prev => prev + 1);
      }
    } catch (err: any) {
      setError(`Failed to move item: ${err.message || JSON.stringify(err)}`);
    } finally {
      setMovingItem(false);
      setDraggedItem(null);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  useEffect(() => {
    if (!user?.id) return;
    
    const initialize = async () => {
      try {
        const team = await getDefaultTeam(user.id);
        setTeamId(team.id);
        
        const role = await getTeamRole(team.id, user.id);
        setUserRole(role);
        
        const members = await getTeamMembers(team.id);
        setTeamMembers(members);
        
        await loadDirectory(team.id, null);
      } catch (err: any) {
        setError(`Failed to load workspace data: ${err.message || JSON.stringify(err)}`);
        console.error(err);
      } finally {
        setLoadingFiles(false);
        setIsInitializing(false);
      }
    };

    initialize();
  }, [user?.id]);

  const canEdit = userRole === 'owner' || userRole === 'admin' || userRole === 'member';

  const loadDirectory = async (tId: string, fId: string | null) => {
    setShowAdminPanel(false);
    setLoadingFiles(true);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        getFolders(tId, fId),
        getTeamFiles(tId, fId)
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
    } catch (err: any) {
      setError(`Failed to load directory: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadRecent = async () => {
    if (!teamId) return;
    setShowAdminPanel(false);
    setLoadingFiles(true);
    try {
      const recentFiles = await getRecentFiles(teamId);
      setFolders([]);
      setFiles(recentFiles);
      setFolderPath([{id: 'recent', name: '.recent'}]);
      setCurrentFolderId('recent');
    } catch (err: any) {
      setError(`Failed to load recent files: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const loadStarred = async () => {
    if (!teamId) return;
    setShowAdminPanel(false);
    setLoadingFiles(true);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        getStarredFolders(teamId, starredItems.folders),
        getStarredFiles(teamId, starredItems.files)
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
      setFolderPath([{id: 'starred', name: '.starred'}]);
      setCurrentFolderId('starred');
    } catch (err: any) {
      setError(`Failed to load starred items: ${err.message || JSON.stringify(err)}`);
    } finally {
      setLoadingFiles(false);
    }
  };

  const navigateToFolder = (folder: FolderRecord, path?: FolderRecord[]) => {
    if (!teamId) return;
    setShowAdminPanel(false);
    setCurrentFolderId(folder.id);
    setFolderPath(prev => {
      // If an absolute path is provided (from sidebar tree), use it
      if (path) return path;

      if (folder.name === '.archive') {
        return [{ id: folder.id, name: folder.name }];
      }
      if (prev.length > 0 && (prev[0].name === '.recent' || prev[0].name === '.starred')) {
        return [{ id: folder.id, name: folder.name }];
      }
      
      // Prevent duplicate appends if already in this folder
      if (prev.length > 0 && prev[prev.length - 1].id === folder.id) {
        return prev;
      }

      return [...prev, { id: folder.id, name: folder.name }];
    });
    loadDirectory(teamId, folder.id);
  };

  const navigateUp = (index: number) => {
    if (!teamId) return;
    setShowAdminPanel(false);
    if (index === -1) {
      // Go to root
      setCurrentFolderId(null);
      setFolderPath([]);
      loadDirectory(teamId, null);
    } else {
      // Go to specific folder in path
      const targetFolder = folderPath[index];
      setCurrentFolderId(targetFolder.id);
      setFolderPath(prev => prev.slice(0, index + 1));
      loadDirectory(teamId, targetFolder.id);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !teamId) return;
    setCreatingFolder(true);
    try {
      const newFolder = await createFolder(teamId, newFolderName, currentFolderId);
      setFolders(prev => [...prev, newFolder].sort((a, b) => a.name.localeCompare(b.name)));
      setRefreshSidebar(prev => prev + 1);
      setShowNewFolderModal(false);
      setNewFolderName('');
    } catch (err: any) {
      setError(`Failed to create folder: ${err.message || JSON.stringify(err)}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  const confirmDeleteFolder = async () => {
    if (!folderToDelete || !teamId) return;
    setDeletingFolderId(folderToDelete.id);
    try {
      const isArchived = folderPath.length > 0 && folderPath[0].name === '.archive';
      if (isArchived) {
        await deleteFolder(folderToDelete.id);
      } else {
        await archiveFolder(folderToDelete.id, teamId);
      }
      setFolders((prev) => prev.filter((f) => f.id !== folderToDelete.id));
      setRefreshSidebar(prev => prev + 1);
      setFolderToDelete(null);
    } catch (err: any) {
      setError(`Failed to delete folder: ${err.message || JSON.stringify(err)}`);
    } finally {
      setDeletingFolderId(null);
    }
  };

  // Handle Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const hasFilters = Object.values(searchFilters).some(v => v !== 'all' && v !== 'any' && v !== 'anyone');
      if ((searchQuery.length >= 3 || hasFilters) && teamId) {
        setSearching(true);
        try {
          const results = await searchDocuments(teamId, searchQuery, searchFilters);
          setSearchResults(results);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, teamId, searchFilters]);

  const handleUploadDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverUpload(true);
  };

  const handleUploadDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverUpload(false);
  };

  const handleUploadDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverUpload(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file || !teamId || uploading) return;

    setUploading(true);
    setError(null);
    setUploadStatus('Uploading file to secure storage...');

    try {
      const newFileRecord = await uploadDocument(file, teamId, currentFolderId, isPrivateUpload);
      setFiles((prev) => [newFileRecord, ...prev]);

      setUploadStatus('Parsing document contents for search index...');
      try {
        const extractedText = await extractTextFromFile(file);
        
        if (extractedText) {
          setUploadStatus('Saving to search index...');
          await saveDocumentContent(newFileRecord.id, extractedText);
        } else {
          setError('File uploaded, but no text could be extracted.');
        }
      } catch (extractError: any) {
        console.error('Extraction error:', extractError);
        setError(`File uploaded, but text extraction failed: ${extractError.message}`);
      }
    } catch (err: any) {
      setError(`Upload failed: ${err.message || JSON.stringify(err)}`);
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !teamId) return;

    setUploading(true);
    setError(null);
    setUploadStatus('Uploading file to secure storage...');

    try {
      const newFileRecord = await uploadDocument(file, teamId, currentFolderId, isPrivateUpload);
      setFiles((prev) => [newFileRecord, ...prev]);

      setUploadStatus('Parsing document contents for search index...');
      try {
        const extractedText = await extractTextFromFile(file);
        
        if (extractedText) {
          setUploadStatus('Saving to search index...');
          await saveDocumentContent(newFileRecord.id, extractedText);
        } else {
          setError('File uploaded, but no text could be extracted.');
        }
      } catch (parseError: any) {
        console.warn('Could not parse file text:', parseError);
        setError(`File uploaded, but text extraction failed: ${parseError.message}`);
      }

    } catch (err: any) {
      console.error("Upload failed details:", err);
      setError(`Upload failed: ${err.message || JSON.stringify(err)}`);
    } finally {
      setUploading(false);
      setUploadStatus('');
      event.target.value = '';
    }
  };

  const handleDownload = async (storagePath: string, fileName: string) => {
    try {
      const signedUrl = await getSignedDownloadUrl(storagePath);
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      setError('Failed to generate download link.');
    }
  };

  const handlePrint = () => {
    if (!previewUrl || !previewFile) return;

    const isImage = previewFile.mime_type?.startsWith('image/');
    const isPdf = previewFile.mime_type === 'application/pdf';
    
    if (isImage) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${previewFile.name}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                img { max-width: 100%; max-height: 100%; }
                @media print {
                  body { display: block; height: auto; }
                  img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
                }
              </style>
            </head>
            <body>
              <img src="${previewUrl}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else if (isPdf) {
      // For PDFs, we can open it in an iframe and print the iframe, or just open in a new tab.
      // Opening in a new tab is more reliable across browsers for PDFs.
      const printWindow = window.open(previewUrl, '_blank');
      if (printWindow) {
        // We don't call print() here because the browser's PDF viewer handles it better
        // and some browsers block script execution on PDF documents.
      }
    } else if (previewText !== null) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${previewFile.name}</title>
              <style>
                body { font-family: monospace; white-space: pre-wrap; padding: 20px; }
                @media print {
                  body { padding: 0; }
                }
              </style>
            </head>
            <body>${previewText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body>
            <script>
              window.onload = () => { window.print(); window.close(); };
            </script>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handlePreview = async (file: UploadedFileRecord) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewText(null);
    
    // Clean up previous object URL if exists
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    
    try {
      const signedUrl = await getSignedDownloadUrl(file.storage_path);
      const isTextFile = file.mime_type?.startsWith('text/') || file.name.match(/\.(md|ts|js|json|html|css|csv|txt)$/i);
      
      if (isTextFile) {
        try {
          const response = await fetch(signedUrl);
          if (!response.ok) throw new Error('Network response was not ok');
          const text = await response.text();
          setPreviewText(text);
          setPreviewUrl(signedUrl);
        } catch (fetchErr) {
          console.warn("Failed to fetch text", fetchErr);
          setPreviewUrl(signedUrl); // Fallback
        }
      } else if (file.mime_type === 'application/pdf') {
        // For react-pdf, we can just pass the signed URL directly.
        // It handles fetching and rendering.
        setPreviewUrl(signedUrl);
      } else {
        setPreviewUrl(signedUrl);
      }
    } catch (err: any) {
      setError(`Failed to load preview: ${err.message || JSON.stringify(err)}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete || !teamId) return;
    setDeletingId(fileToDelete.id);
    try {
      const isArchived = folderPath.length > 0 && folderPath[0].name === '.archive';
      if (isArchived) {
        await deleteDocument(fileToDelete.id, fileToDelete.storage_path);
      } else {
        await archiveDocument(fileToDelete.id, teamId);
      }
      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err: any) {
      setError(`Failed to delete file: ${err.message || JSON.stringify(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const startRename = (file: UploadedFileRecord) => {
    setEditingFileId(file.id);
    setEditName(file.name);
  };

  const handleRename = async (fileId: string) => {
    if (!editName.trim()) {
      setEditingFileId(null);
      return;
    }
    setRenamingId(fileId);
    try {
      await updateDocumentName(fileId, editName);
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, name: editName } : f))
      );
      setEditingFileId(null);
    } catch (err: any) {
      setError(`Failed to rename file: ${err.message || JSON.stringify(err)}`);
    } finally {
      setRenamingId(null);
    }
  };

  const highlightText = (text: string, query: string) => {
    if (!query) return text.substring(0, 150) + '...';
    
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const index = lowerText.indexOf(lowerQuery);
    
    if (index === -1) return text.substring(0, 150) + '...';
    
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + query.length + 40);
    const snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
    
    return snippet;
  };

  const getOwnerName = (created_by: string | null | undefined) => {
    if (!created_by) return 'Unknown';
    if (created_by === user?.id) return 'Me';
    const member = teamMembers.find(m => m.user_id === created_by);
    if (member && member.users) {
      return member.users.full_name || member.users.email || 'Unknown User';
    }
    return 'Unknown User';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (isInitializing) {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  if (userRole === 'viewer') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-950 items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Account Pending Activation</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            Your account has been created successfully, but it requires administrator approval before you can access the government files repository. Please wait while your account is being activated, or contact your administrator.
          </p>
          <button 
            onClick={() => signOut()}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden fadeUp"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 transform md:relative md:translate-x-0 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col justify-between flex-shrink-0 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
          <div className={`h-16 flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center px-0' : 'px-6'}`}>
            <div className="h-8 w-8 rounded-full overflow-hidden flex items-center justify-center shadow-sm bg-white shrink-0">
              <img 
                src="/logo.png" 
                alt="CADOcs Logo" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path><line x1="6" y1="16" x2="6.01" y2="16"></line><line x1="10" y1="16" x2="10.01" y2="16"></line></svg>';
                }}
              />
            </div>
            {!isSidebarCollapsed && <span className="font-heading font-bold text-xl text-slate-900 dark:text-white tracking-tight">CADOcs</span>}
          </div>
          
          <div className={`mt-4 flex gap-2 ${isSidebarCollapsed ? 'px-3 flex-col' : 'px-4'}`}>
            {canEdit && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred')) && (
              <>
                <button 
                  onClick={() => { setShowUploadPanel(true); setIsMobileMenuOpen(false); }}
                  className={`bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl py-2.5 flex items-center justify-center gap-2 font-medium transition-all duration-300 shadow-sm shadow-indigo-500/20 hover:shadow-indigo-500/40 animate-pulse-slow ${isSidebarCollapsed ? 'w-full px-0' : 'flex-1'}`}
                  title="Upload New File"
                >
                  <Plus className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && <span>New</span>}
                </button>
                {!isSidebarCollapsed && (
                  <button 
                    onClick={() => { setShowNewFolderModal(true); setIsMobileMenuOpen(false); }}
                    className="px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-xl flex items-center justify-center transition-colors"
                    title="New Folder"
                  >
                    <FolderPlus className="w-5 h-5" />
                  </button>
                )}
              </>
            )}
          </div>

          <nav className="mt-6 px-3 space-y-1.5">
            <div className="space-y-1.5 animate-fade-up" style={{ animationDelay: '50ms' }}>
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); navigateUp(-1); setIsMobileMenuOpen(false); }} 
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group ${!showAdminPanel && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred')) ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'} ${dragOverFolderId === null ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''}`}
                onDragOver={(e) => handleDragOver(e, null)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, null)}
                title="My Files"
              >
                <Folder className={`w-5 h-5 shrink-0 ${!showAdminPanel && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred')) ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-500 transition-colors'}`} /> 
                {!isSidebarCollapsed && <span>My Files</span>}
              </a>
              {teamId && !isSidebarCollapsed && (
                <div className="pl-3">
                  <SidebarFolderTree 
                    teamId={teamId} 
                    currentFolderId={currentFolderId} 
                    onNavigate={(f, p) => { navigateToFolder(f, p); setIsMobileMenuOpen(false); }} 
                    refreshTrigger={refreshSidebar}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    dragOverFolderId={dragOverFolderId}
                  />
                </div>
              )}
            </div>
            
            <a href="#" onClick={(e) => { e.preventDefault(); loadRecent(); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group animate-fade-up ${!showAdminPanel && folderPath.length > 0 && folderPath[0].name === '.recent' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`} style={{ animationDelay: '100ms' }} title="Recent">
              <Clock className={`w-5 h-5 shrink-0 ${!showAdminPanel && folderPath.length > 0 && folderPath[0].name === '.recent' ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-500 transition-colors'}`} /> 
              {!isSidebarCollapsed && <span>Recent</span>}
            </a>
            
            <a href="#" onClick={(e) => { e.preventDefault(); loadStarred(); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group animate-fade-up ${!showAdminPanel && folderPath.length > 0 && folderPath[0].name === '.starred' ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`} style={{ animationDelay: '150ms' }} title="Starred">
              <Star className={`w-5 h-5 shrink-0 ${!showAdminPanel && folderPath.length > 0 && folderPath[0].name === '.starred' ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-500 transition-colors'}`} /> 
              {!isSidebarCollapsed && <span>Starred</span>}
            </a>
            
            <a href="#" onClick={async (e) => {
              e.preventDefault();
              setIsMobileMenuOpen(false);
              if (!teamId) return;
              try {
                const archiveFolder = await getArchiveFolder(teamId);
                navigateToFolder(archiveFolder);
              } catch (err: any) {
                setError(`Failed to open Trash: ${err.message || JSON.stringify(err)}`);
              }
            }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group animate-fade-up ${folderPath.length > 0 && folderPath[0].name === '.archive' && !showAdminPanel ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`} style={{ animationDelay: '200ms' }} title="Trash">
              <Trash2 className={`w-5 h-5 shrink-0 ${folderPath.length > 0 && folderPath[0].name === '.archive' && !showAdminPanel ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-500 transition-colors'}`} /> 
              {!isSidebarCollapsed && <span>Trash</span>}
            </a>
            
            {(userRole === 'owner' || userRole === 'admin') && (
              <a href="#" onClick={(e) => { e.preventDefault(); setShowAdminPanel(true); setIsMobileMenuOpen(false); }} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group animate-fade-up ${showAdminPanel ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'}`} style={{ animationDelay: '250ms' }} title="Team Management">
                <Shield className={`w-5 h-5 shrink-0 ${showAdminPanel ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-indigo-500 transition-colors'}`} /> 
                {!isSidebarCollapsed && <span>Team Management</span>}
              </a>
            )}
          </nav>
          
          {!isSidebarCollapsed && (
            <div className="mt-8 px-6 animate-fade-up" style={{ animationDelay: '300ms' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Folders</h3>
              </div>
              <nav className="space-y-1 -mx-3">
                {folders.map(folder => (
                  <div key={folder.id} className="flex items-center justify-between px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 rounded-xl group transition-all duration-200">
                    <a href="#" onClick={(e) => { e.preventDefault(); navigateToFolder(folder); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 font-medium flex-1 truncate">
                      <Folder className="w-5 h-5 shrink-0 text-indigo-400 dark:text-indigo-500" /> 
                      <span className="truncate">{folder.name}</span>
                    </a>
                    {canEdit && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Folder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                {folders.length === 0 && (
                  <div className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500 italic">No folders yet</div>
                )}
              </nav>
            </div>
          )}
        </div>
        
        <div className="p-3 mt-auto shrink-0 bg-gradient-to-t from-white via-white to-transparent dark:from-navy-900 dark:via-navy-900 dark:to-transparent pt-6">
          <div className="border border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-navy-800/50 rounded-xl p-2 flex items-center gap-3 transition-all hover:bg-slate-100 dark:hover:bg-navy-800 group">
            <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold text-sm shrink-0 ring-2 ring-white dark:ring-navy-900 shadow-sm">
              {user?.email?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            {!isSidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user?.email?.split('@')[0] || 'User'}</p>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              </div>
            )}
            <button onClick={signOut} className={`text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 p-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${isSidebarCollapsed ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`} title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Collapse Toggle */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute -right-3 top-20 bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-700 rounded-full p-1 shadow-sm text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 z-30 hidden md:flex"
        >
          <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-navy-950 relative z-10">
        {/* Header */}
        <header className="h-20 border-b border-slate-200/50 dark:border-slate-800/50 flex items-center justify-between px-4 md:px-8 flex-shrink-0 bg-white/80 dark:bg-navy-950/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl md:text-2xl font-heading font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-md">
              {showAdminPanel ? 'Team Management' : (folderPath.length > 0 ? (folderPath[0].name === '.archive' ? 'Trash' : (folderPath[0].name === '.recent' ? 'Recent' : (folderPath[0].name === '.starred' ? 'Starred' : 'My Files'))) : 'My Files')}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex items-center gap-2 group hidden sm:flex">
              <div className="relative flex-1 transition-all duration-300 ease-in-out w-48 md:w-64 focus-within:w-64 md:focus-within:w-96">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Search files..." 
                  className="w-full bg-slate-100/80 dark:bg-navy-800/80 border border-transparent focus:border-indigo-500/50 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-sm"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchSuggestions(true);
                    setActiveSuggestionIndex(-1);
                  }}
                  onFocus={() => setShowSearchSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowSearchSuggestions(false), 200);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredSuggestions.length) {
                        handleSearchSubmit(filteredSuggestions[activeSuggestionIndex]);
                      } else {
                        handleSearchSubmit(searchQuery);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setActiveSuggestionIndex(prev => 
                        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
                      );
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setActiveSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
                    } else if (e.key === 'Escape') {
                      setShowSearchSuggestions(false);
                    }
                  }}
                />
                {showSearchSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-navy-800/95 backdrop-blur-xl rounded-xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 py-2 z-50 animate-scale-in origin-top">
                    <div className="px-4 py-1.5 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Recent Searches
                    </div>
                    {filteredSuggestions.map((suggestion, index) => (
                      <div
                        key={suggestion}
                        className={`px-4 py-2.5 text-sm cursor-pointer flex items-center gap-3 transition-colors ${
                          index === activeSuggestionIndex 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' 
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                        onClick={() => handleSearchSubmit(suggestion)}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                      >
                        <Clock className="w-4 h-4 opacity-50" />
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
                {searching && (
                  <div className="absolute right-10 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500 dark:text-indigo-400" />
                  </div>
                )}
                <button 
                  onClick={() => setShowSearchFilters(!showSearchFilters)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-xl transition-all duration-200 ${showSearchFilters || Object.values(searchFilters).some(v => v !== 'all' && v !== 'any' && v !== 'anyone') ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300'}`}
                  title="Search Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
              
              {showSearchFilters && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-white/95 dark:bg-navy-800/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 p-5 z-50 animate-scale-in origin-top-right">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">File Type</label>
                      <select 
                        value={searchFilters.fileType}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, fileType: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-300 transition-all"
                      >
                        <option value="all">Any type</option>
                        <option value="pdf">PDFs</option>
                        <option value="document">Documents</option>
                        <option value="spreadsheet">Spreadsheets</option>
                        <option value="image">Images</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Date Modified</label>
                      <select 
                        value={searchFilters.dateModified}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, dateModified: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-300 transition-all"
                      >
                        <option value="any">Any time</option>
                        <option value="today">Today</option>
                        <option value="7days">Last 7 days</option>
                        <option value="30days">Last 30 days</option>
                        <option value="year">This year</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">Owner</label>
                      <select 
                        value={searchFilters.owner}
                        onChange={(e) => setSearchFilters(prev => ({ ...prev, owner: e.target.value }))}
                        className="w-full bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-700 dark:text-slate-300 transition-all"
                      >
                        <option value="anyone">Anyone</option>
                        <option value={user?.id || 'me'}>Owned by me</option>
                        {teamMembers.filter(m => m.user_id !== user?.id).map(member => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.users?.full_name || member.users?.email || 'Unknown User'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={toggleTheme}
                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all duration-200"
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <button 
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="p-2.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all duration-200"
                title="Configure Columns"
              >
                <Settings2 className="w-5 h-5" />
              </button>
              {showColumnDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-navy-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-2 z-10 glass-panel">
                  <div className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-2">
                    Visible Columns
                  </div>
                  <label className="flex items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={columns.owner} 
                      onChange={(e) => setColumns(prev => ({ ...prev, owner: e.target.checked }))}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4 mr-3 transition-all"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Owner</span>
                  </label>
                  <label className="flex items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={columns.lastModified} 
                      onChange={(e) => setColumns(prev => ({ ...prev, lastModified: e.target.checked }))}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4 mr-3 transition-all"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Last Modified</span>
                  </label>
                  <label className="flex items-center px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                    <input 
                      type="checkbox" 
                      checked={columns.size} 
                      onChange={(e) => setColumns(prev => ({ ...prev, size: e.target.checked }))}
                      className="rounded border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500 w-4 h-4 mr-3 transition-all"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Size</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 bg-slate-50 dark:bg-transparent">
          {showAdminPanel ? (
            <AdminPanel teamId={teamId!} currentUserRole={userRole} currentUserId={user?.id} />
          ) : (
          <div className="max-w-7xl mx-auto fadeUp" style={{ animationDelay: '0.1s' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400 overflow-x-auto no-scrollbar py-1 flex-1">
                <div className="flex items-center gap-1 bg-white/50 dark:bg-navy-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-sm">
                  <button 
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${draggedItem && dragOverFolderId === null ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : ''}`}
                    onClick={() => navigateUp(-1)}
                    onDragOver={(e) => handleDragOver(e, null)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, null)}
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>CADOcs</span>
                  </button>
                  
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mx-0.5" />
                  
                  <button 
                    className={`px-2 py-1 rounded-lg transition-all duration-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${folderPath.length === 0 ? 'text-slate-900 dark:text-white font-bold bg-white dark:bg-navy-800 shadow-sm' : ''} ${draggedItem && dragOverFolderId === null ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : ''}`}
                    onClick={() => {
                      if (folderPath.length > 0 && folderPath[0].name === '.recent') {
                        loadRecent();
                      } else if (folderPath.length > 0 && folderPath[0].name === '.starred') {
                        loadStarred();
                      } else if (folderPath.length > 0 && folderPath[0].name === '.archive') {
                        if (teamId) {
                          getArchiveFolder(teamId).then(f => navigateToFolder(f));
                        }
                      } else {
                        navigateUp(-1);
                      }
                    }}
                    onDragOver={(e) => {
                      if (folderPath.length > 0 && (folderPath[0].name === '.recent' || folderPath[0].name === '.starred' || folderPath[0].name === '.archive')) return;
                      handleDragOver(e, null);
                    }}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      if (folderPath.length > 0 && (folderPath[0].name === '.recent' || folderPath[0].name === '.starred' || folderPath[0].name === '.archive')) return;
                      handleDrop(e, null);
                    }}
                  >
                    {folderPath.length > 0 ? (folderPath[0].name === '.archive' ? 'Trash' : (folderPath[0].name === '.recent' ? 'Recent' : (folderPath[0].name === '.starred' ? 'Starred' : 'My Files'))) : 'My Files'}
                  </button>
                  
                  {folderPath.map((folder, index) => {
                    if (index === 0 && (folder.name === '.archive' || folder.name === '.recent' || folder.name === '.starred')) return null;
                    return (
                      <React.Fragment key={folder.id}>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 mx-0.5" />
                        <button 
                          className={`px-2 py-1 rounded-lg transition-all duration-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${index === folderPath.length - 1 ? 'text-slate-900 dark:text-white font-bold bg-white dark:bg-navy-800 shadow-sm' : ''} ${draggedItem && dragOverFolderId === folder.id ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20' : ''}`}
                          onClick={() => navigateUp(index)}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, folder.id)}
                        >
                          {folder.name}
                        </button>
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>

              {canEdit && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred')) && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowNewFolderModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm group"
                  >
                    <FolderPlus className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                    <span>New Folder</span>
                  </button>
                  <button 
                    onClick={triggerFileUpload}
                    className="flex md:hidden items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 dark:shadow-none"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                </div>
              )}
            </div>

          {/* Active Filters Chips */}
          {(searchFilters.fileType !== 'all' || searchFilters.dateModified !== 'any' || searchFilters.owner !== 'anyone') && (
            <div className="flex flex-wrap items-center gap-2 mb-6 fadeUp" style={{ animationDelay: '0.15s' }}>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-2">Filters:</span>
              {searchFilters.fileType !== 'all' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium border border-indigo-100 dark:border-indigo-800/50">
                  <span>Type: {searchFilters.fileType}</span>
                  <button onClick={() => setSearchFilters(prev => ({ ...prev, fileType: 'all' }))} className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {searchFilters.dateModified !== 'any' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium border border-indigo-100 dark:border-indigo-800/50">
                  <span>Date: {searchFilters.dateModified}</span>
                  <button onClick={() => setSearchFilters(prev => ({ ...prev, dateModified: 'any' }))} className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {searchFilters.owner !== 'anyone' && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium border border-indigo-100 dark:border-indigo-800/50">
                  <span>Owner: {searchFilters.owner === (user?.id || 'me') ? 'Me' : 'Other'}</span>
                  <button onClick={() => setSearchFilters(prev => ({ ...prev, owner: 'anyone' }))} className="p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <button 
                onClick={() => setSearchFilters({ fileType: 'all', dateModified: 'any', owner: 'anyone' })}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ml-2"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Search Results or File List */}
          {searchQuery.length >= 3 || Object.values(searchFilters).some(v => v !== 'all' && v !== 'any' && v !== 'anyone') ? (
            <div className="mb-8">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">Search Results</h3>
              {searching ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500 dark:text-indigo-400" /></div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <div key={result.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors bg-white dark:bg-navy-900 shadow-sm hover:shadow-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                          <span className="font-bold text-slate-900 dark:text-white">{result.files.name}</span>
                          {result.files.description === '__VISIBILITY_PRIVATE__' && (
                            <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" title="Private File" />
                          )}
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {getOwnerName(result.files.created_by)}
                          </span>
                          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                            {formatTimeAgo(result.files.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button onClick={() => handlePreview(result.files)} className="text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Preview</button>
                          <button onClick={() => handleDownload(result.files.storage_path, result.files.name)} className="text-sm text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700 dark:hover:text-slate-300 dark:text-slate-300 hover:underline">Download</button>
                        </div>
                      </div>
                      {result.content && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                          "...{highlightText(result.content, searchQuery)}..."
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8 font-medium">No documents found matching your search criteria</p>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/20">
                  <th className="py-4 px-6 font-bold">Name <span className="inline-block ml-1">↑</span></th>
                  {columns.owner && <th className="py-4 px-6 font-bold">Owner</th>}
                  {columns.lastModified && <th className="py-4 px-6 font-bold">Last Modified</th>}
                  {columns.size && <th className="py-4 px-6 font-bold">Size</th>}
                  <th className="py-4 px-6 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {/* Folders */}
                {folders.map(folder => (
                  <tr 
                    key={folder.id} 
                    className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer transition-colors ${dragOverFolderId === folder.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''} ${draggedItem?.id === folder.id ? 'opacity-50' : ''}`}
                    onClick={() => navigateToFolder(folder)}
                    draggable={canEdit && folder.name !== '.archive' && folder.name !== '.recent' && folder.name !== '.starred' && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred'))}
                    onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, folder.id)}
                  >
                    <td className="py-4 px-6 flex items-center gap-4">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
                        <Folder className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-100 dark:fill-indigo-900/50" />
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{folder.name}</span>
                    </td>
                    {columns.owner && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">{getOwnerName(folder.created_by)}</td>}
                    {columns.lastModified && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">{formatTimeAgo(folder.created_at)}</td>}
                    {columns.size && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">--</td>}
                    <td className="py-4 px-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setStarredItems(prev => ({
                              ...prev,
                              folders: prev.folders.includes(folder.id) 
                                ? prev.folders.filter(id => id !== folder.id)
                                : [...prev.folders, folder.id]
                            }));
                          }}
                          className={`p-2 rounded-xl transition-colors ${starredItems.folders.includes(folder.id) ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'}`}
                          title={starredItems.folders.includes(folder.id) ? "Unstar" : "Star"}
                        >
                          <Star className={`w-4 h-4 ${starredItems.folders.includes(folder.id) ? 'fill-current' : ''}`} />
                        </button>
                        {canEdit && folderPath.length > 0 && folderPath[0].name === '.archive' && (
                          <button 
                            onClick={async () => {
                              try {
                                await restoreFolder(folder.id);
                                setFolders(prev => prev.filter(f => f.id !== folder.id));
                                setRefreshSidebar(prev => prev + 1);
                              } catch (err: any) {
                                setError(`Failed to restore folder: ${err.message || JSON.stringify(err)}`);
                              }
                            }} 
                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors" 
                            title="Restore Folder"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                        {canEdit && (
                          <button onClick={() => setFolderToDelete(folder)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Delete Folder">
                            {deletingFolderId === folder.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                
                {/* Actual files */}
                {loadingFiles ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={`skeleton-${i}`} className="border-b border-slate-100 dark:border-slate-800/50 animate-pulse">
                      <td className="py-4 px-6 flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-48"></div>
                      </td>
                      {columns.owner && <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></td>}
                      {columns.lastModified && <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div></td>}
                      {columns.size && <td className="py-4 px-6"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></td>}
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded"></div>
                          <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : files.length === 0 && folders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-navy-800 rounded-3xl flex items-center justify-center mb-6 text-slate-300 dark:text-slate-700">
                          <FolderPlus className="w-10 h-10" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">This folder is empty</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                          Get started by creating a new folder or uploading your first document.
                        </p>
                        <div className="flex items-center gap-3">
                          {canEdit && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred')) && (
                            <>
                              <button 
                                onClick={() => setShowNewFolderModal(true)}
                                className="px-5 py-2.5 bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2"
                              >
                                <FolderPlus className="w-4 h-4 text-indigo-500" />
                                Create Folder
                              </button>
                              <button 
                                onClick={triggerFileUpload}
                                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                              >
                                <UploadCloud className="w-4 h-4" />
                                Upload File
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  files.map(file => {
                    const isPdf = file.name.toLowerCase().endsWith('.pdf');
                    const isImg = file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|svg)$/);
                    const isCode = file.name.toLowerCase().match(/\.(md|ts|js|json|html|css)$/);
                    const isSpreadsheet = file.name.toLowerCase().match(/\.(csv|xlsx|xls)$/);
                    const isArchive = file.name.toLowerCase().match(/\.(zip|tar|gz|rar)$/);
                    const isAudio = file.name.toLowerCase().match(/\.(mp3|wav|ogg)$/);
                    const isVideo = file.name.toLowerCase().match(/\.(mp4|webm|mov)$/);
                    
                    let FileIconComponent = FileText;
                    let iconColor = "text-slate-500 dark:text-slate-400";
                    let bgColor = "bg-slate-50 dark:bg-slate-800/50";
                    
                    if (isPdf) {
                      FileIconComponent = FileText;
                      iconColor = "text-red-600 dark:text-red-400";
                      bgColor = "bg-red-50 dark:bg-red-900/30";
                    } else if (isImg) {
                      FileIconComponent = ImageIcon;
                      iconColor = "text-emerald-600 dark:text-emerald-400";
                      bgColor = "bg-emerald-50 dark:bg-emerald-900/30";
                    } else if (isCode) {
                      FileIconComponent = FileCode;
                      iconColor = "text-blue-600 dark:text-blue-400";
                      bgColor = "bg-blue-50 dark:bg-blue-900/30";
                    } else if (isSpreadsheet) {
                      FileIconComponent = FileSpreadsheet;
                      iconColor = "text-green-600 dark:text-green-400";
                      bgColor = "bg-green-50 dark:bg-green-900/30";
                    } else if (isArchive) {
                      FileIconComponent = FileArchive;
                      iconColor = "text-amber-600 dark:text-amber-400";
                      bgColor = "bg-amber-50 dark:bg-amber-900/30";
                    } else if (isAudio) {
                      FileIconComponent = FileAudio;
                      iconColor = "text-purple-600 dark:text-purple-400";
                      bgColor = "bg-purple-50 dark:bg-purple-900/30";
                    } else if (isVideo) {
                      FileIconComponent = FileVideo;
                      iconColor = "text-pink-600 dark:text-pink-400";
                      bgColor = "bg-pink-50 dark:bg-pink-900/30";
                    }

                    return (
                      <tr 
                        key={file.id} 
                        onClick={() => handlePreview(file)} 
                        className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer transition-colors ${draggedItem?.id === file.id ? 'opacity-50' : ''}`}
                        draggable={canEdit && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred'))}
                        onDragStart={(e) => handleDragStart(e, 'file', file.id)}
                      >
                        <td className="py-4 px-6 flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl ${bgColor} group-hover:bg-opacity-80 transition-colors`}>
                            <FileIconComponent className={`w-5 h-5 ${iconColor}`} />
                          </div>
                          {editingFileId === file.id ? (
                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                disabled={renamingId === file.id}
                                className="block w-full rounded-xl border-0 py-1.5 px-3 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm disabled:opacity-50 bg-white dark:bg-navy-900"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(file.id);
                                  if (e.key === 'Escape') setEditingFileId(null);
                                }}
                              />
                              <button onClick={() => handleRename(file.id)} disabled={renamingId === file.id} className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-xl disabled:opacity-50 transition-colors">
                                {renamingId === file.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button onClick={() => setEditingFileId(null)} disabled={renamingId === file.id} className="p-1.5 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl disabled:opacity-50 transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[250px]">{file.name}</span>
                              {file.description === '__VISIBILITY_PRIVATE__' && (
                                <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" title="Private File" />
                              )}
                            </div>
                          )}
                        </td>
                        {columns.owner && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">{getOwnerName(file.created_by)}</td>}
                        {columns.lastModified && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">{formatTimeAgo(file.created_at)}</td>}
                        {columns.size && <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-medium">{(file.size_bytes / 1024 / 1024).toFixed(1)} MB</td>}
                        <td className="py-4 px-6 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setStarredItems(prev => ({
                                  ...prev,
                                  files: prev.files.includes(file.id) 
                                    ? prev.files.filter(id => id !== file.id)
                                    : [...prev.files, file.id]
                                }));
                              }}
                              className={`p-2 rounded-xl transition-colors ${starredItems.files.includes(file.id) ? 'text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30' : 'text-slate-400 dark:text-slate-500 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30'}`}
                              title={starredItems.files.includes(file.id) ? "Unstar" : "Star"}
                            >
                              <Star className={`w-4 h-4 ${starredItems.files.includes(file.id) ? 'fill-current' : ''}`} />
                            </button>
                            {canEdit && folderPath.length > 0 && folderPath[0].name === '.archive' && (
                              <button 
                                onClick={async () => {
                                  try {
                                    await restoreDocument(file.id);
                                    setFiles(prev => prev.filter(f => f.id !== file.id));
                                  } catch (err: any) {
                                    setError(`Failed to restore file: ${err.message || JSON.stringify(err)}`);
                                  }
                                }} 
                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors" 
                                title="Restore File"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {canEdit && (folderPath.length === 0 || folderPath[0].name !== '.archive') && (
                              <button onClick={() => startRename(file)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors" title="Rename"><Edit2 className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => handleDownload(file.storage_path, file.name)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-colors" title="Download"><Download className="w-4 h-4" /></button>
                            {canEdit && (
                              <button onClick={() => setFileToDelete(file)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Delete">
                                {deletingId === file.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          )}
        </div>
          )}
        </div>
      </main>

      {/* Right Sidebar - Upload Panel */}
      {showUploadPanel && canEdit && (folderPath.length === 0 || (folderPath[0].name !== '.archive' && folderPath[0].name !== '.recent' && folderPath[0].name !== '.starred')) && (
        <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-navy-900 flex flex-col flex-shrink-0 slideInRight">
          <div className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
            <h2 className="font-bold text-slate-900 dark:text-white">Upload</h2>
            <button onClick={() => setShowUploadPanel(false)} className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/50">
                {error}
              </div>
            )}
            
            <label 
              htmlFor="file-upload" 
              className={`block w-full h-80 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer relative group mb-6 ${
                isDraggingOverUpload 
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-inner' 
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-navy-800/30 hover:bg-indigo-50/50 dark:hover:bg-indigo-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50'
              }`}
              onDragOver={handleUploadDragOver}
              onDragLeave={handleUploadDragLeave}
              onDrop={handleUploadDrop}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                {uploading ? (
                  <>
                    <div className="relative mb-4">
                      <svg className="w-16 h-16 text-indigo-100 dark:text-indigo-900/50" viewBox="0 0 100 100">
                        <circle className="stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                      </svg>
                      <svg className="w-16 h-16 text-indigo-500 dark:text-indigo-400 absolute top-0 left-0 animate-spin" viewBox="0 0 100 100">
                        <circle className="stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset="125.6"></circle>
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Uploading...</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{uploadStatus}</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white dark:bg-navy-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
                      <UploadCloud className="w-8 h-8 text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Drag & Drop files here</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">or click to browse from your computer</p>
                    <div className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 dark:shadow-none transition-colors mb-6">
                      Browse Files
                    </div>
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Supports PDF, PNG, JPG, MD, TS up to 50MB</p>
                  </>
                )}
              </div>
              <input 
                id="file-upload" 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={uploading || !teamId}
                accept=".pdf,.txt,.md,.csv,.png,.jpg,.jpeg"
              />
            </label>

            <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-navy-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  Private Upload
                </h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Only you will be able to see this file</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivateUpload(!isPrivateUpload)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                  isPrivateUpload ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                }`}
                role="switch"
                aria-checked={isPrivateUpload}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isPrivateUpload ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 fadeUp">
          <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 scaleIn">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Create New Folder</h3>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="block w-full rounded-xl border-0 py-2.5 px-4 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-300 dark:ring-slate-700 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 sm:text-sm mb-6 bg-slate-50 dark:bg-navy-950 transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolderModal(false);
              }}
            />
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowNewFolderModal(false)}
                disabled={creatingFolder}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateFolder}
                disabled={creatingFolder || !newFolderName.trim()}
                className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-indigo-200 dark:shadow-none"
              >
                {creatingFolder && <Loader2 className="w-4 h-4 animate-spin" />}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Folder Confirmation Modal */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 fadeUp">
          <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 scaleIn">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {folderPath.length > 0 && folderPath[0].name === '.archive' ? 'Permanently Delete Folder' : 'Move to Trash'}
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to {folderPath.length > 0 && folderPath[0].name === '.archive' ? 'permanently delete' : 'move'} <span className="font-bold text-slate-900 dark:text-white">"{folderToDelete.name}"</span> and all its contents{folderPath.length > 0 && folderPath[0].name === '.archive' ? '?' : ' to the trash?'} 
              {folderPath.length > 0 && folderPath[0].name === '.archive' && (
                <>
                  <br /><br />
                  <span className="text-red-600 dark:text-red-400 font-bold">Warning: This action cannot be undone and will permanently delete all files inside this folder.</span>
                </>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setFolderToDelete(null)}
                disabled={deletingFolderId === folderToDelete.id}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDeleteFolder}
                disabled={deletingFolderId === folderToDelete.id}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-red-200 dark:shadow-none"
              >
                {deletingFolderId === folderToDelete.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {folderPath.length > 0 && folderPath[0].name === '.archive' ? 'Delete Permanently' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 fadeUp">
          <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 scaleIn">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-400">
              <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {folderPath.length > 0 && folderPath[0].name === '.archive' ? 'Permanently Delete File' : 'Move to Trash'}
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-6">
              Are you sure you want to {folderPath.length > 0 && folderPath[0].name === '.archive' ? 'permanently delete' : 'move'} <span className="font-bold text-slate-900 dark:text-white">"{fileToDelete.name}"</span>{folderPath.length > 0 && folderPath[0].name === '.archive' ? '?' : ' to the trash?'}
              {folderPath.length > 0 && folderPath[0].name === '.archive' && (
                <>
                  <br /><br />
                  <span className="text-red-600 dark:text-red-400 font-bold">Warning: This action cannot be undone.</span>
                </>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setFileToDelete(null)}
                disabled={deletingId === fileToDelete.id}
                className="px-5 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={deletingId === fileToDelete.id}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm shadow-red-200 dark:shadow-none"
              >
                {deletingId === fileToDelete.id && <Loader2 className="w-4 h-4 animate-spin" />}
                {folderPath.length > 0 && folderPath[0].name === '.archive' ? 'Delete Permanently' : 'Move to Trash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm fadeUp">
          <div className="bg-white dark:bg-navy-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 scaleIn">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-navy-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{previewFile.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handlePrint}
                  disabled={previewLoading || !previewUrl || (!previewFile?.mime_type?.startsWith('image/') && previewFile?.mime_type !== 'application/pdf' && previewText === null)}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
                  title="Print"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { 
                    setPreviewFile(null); 
                    if (previewUrl && previewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(null); 
                  }}
                  className="p-2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 overflow-hidden relative flex items-center justify-center">
              {previewLoading ? (
                <div className="flex flex-col items-center text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500 dark:text-indigo-400" />
                  <p className="font-medium">Loading preview...</p>
                </div>
              ) : previewText !== null ? (
                <div className="w-full h-full p-8 overflow-auto bg-white dark:bg-navy-900 text-left">
                  <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 dark:text-slate-200">{previewText}</pre>
                </div>
              ) : previewUrl ? (
                previewFile.mime_type?.startsWith('image/') ? (
                  <img src={previewUrl} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                ) : previewFile.mime_type === 'application/pdf' ? (
                  <div className="w-full h-full overflow-auto bg-slate-200 dark:bg-slate-700 flex flex-col items-center py-8">
                    <Document
                      file={previewUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      loading={
                        <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 my-12">
                          <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500 dark:text-indigo-400" />
                          <p className="font-medium">Loading PDF...</p>
                        </div>
                      }
                      error={
                        <div className="text-red-500 my-12 bg-white dark:bg-navy-900 p-6 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30">
                          <p className="font-bold">Failed to load PDF.</p>
                          <p className="text-sm mt-1">Please try downloading it instead.</p>
                        </div>
                      }
                      className="flex flex-col items-center"
                    >
                      {Array.from(new Array(numPages || 0), (el, index) => (
                        <div key={`page_${index + 1}`} className="mb-6 shadow-xl bg-white dark:bg-navy-900 rounded-xl overflow-hidden">
                          <Page 
                            pageNumber={index + 1} 
                            renderTextLayer={true}
                            renderAnnotationLayer={true}
                            width={Math.min(window.innerWidth * 0.8, 800)}
                          />
                        </div>
                      ))}
                    </Document>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-slate-500 dark:text-slate-400 p-8 text-center bg-white dark:bg-navy-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md m-4">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                      <FileText className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">No preview available</p>
                    <p className="mb-8 font-medium text-slate-500 dark:text-slate-400">This file type ({previewFile.mime_type || 'unknown'}) cannot be previewed directly in the browser.</p>
                    <button 
                      onClick={() => handleDownload(previewFile.storage_path, previewFile.name)}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200 dark:shadow-none"
                    >
                      <Download className="w-5 h-5" />
                      Download File
                    </button>
                  </div>
                )
              ) : (
                <div className="text-red-500 font-bold bg-white dark:bg-navy-900 p-6 rounded-2xl shadow-xl border border-red-100 dark:border-red-900/30">Failed to load preview URL.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
