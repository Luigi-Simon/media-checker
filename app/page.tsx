'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Search, Moon, Sun, Download, LayoutGrid, List, ChevronRight, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TableVirtuoso, VirtuosoGrid } from 'react-virtuoso';

// Debounced TikTok embed.js reloader — coalesces simultaneous mount calls
// so only one script reload fires even when many cards scroll into view at once.
let tikTokEmbedTimer: ReturnType<typeof setTimeout> | null = null;
const reloadTikTokScript = () => {
  if (tikTokEmbedTimer) clearTimeout(tikTokEmbedTimer);
  tikTokEmbedTimer = setTimeout(() => {
    const existing = document.querySelector('script[src="https://www.tiktok.com/embed.js"]');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    document.body.appendChild(script);
  }, 100);
};

// --- Smart Media Renderer ---
const MediaRenderer = ({ url, onOpenModal = null }: { url: string; onOpenModal?: ((url: string) => void) | null }) => {
  const [tikTokMp4, setTikTokMp4] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState(null);

  useEffect(() => {
    setTikTokMp4(null);
    setThumbnailUrl(null);
    const cleanUrl = url?.toLowerCase().split('?')[0] || '';
    if (!cleanUrl.includes('tiktok.com')) return;

    if (/\/video\/\d+/.test(cleanUrl)) {
      let cancelled = false;
      fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`)
        .then(res => res.json())
        .then(data => {
          if (cancelled || data?.code !== 0 || !data?.data) return;
          const playUrl = data.data.play || data.data.wmplay;
          if (playUrl) setTikTokMp4(playUrl);
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }

    if (/\/photo\/\d+/.test(cleanUrl)) {
      let cancelled = false;
      fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(json => {
          if (!cancelled && json?.thumbnail_url) setThumbnailUrl(json.thumbnail_url);
        })
        .catch(() => {});
      return () => { cancelled = true; };
    }
  }, [url]);

  if (!url) return <span className="text-gray-400 text-sm">No media URL</span>;

  const cleanUrl = url.toLowerCase().split('?')[0];

  if (cleanUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)$/)) {
    return <img src={url} alt="Creative" className="h-full w-full object-contain bg-gray-100 dark:bg-gray-800 rounded shadow-sm" loading="lazy" />;
  }

  if (cleanUrl.match(/\.(mp4|webm|ogg)$/)) {
    return <video src={url} autoPlay muted loop playsInline controls className="h-full w-full object-contain rounded shadow-sm bg-black" />;
  }

  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
    const videoId = url.split('v=')[1]?.split('&')[0] || url.split('youtu.be/')[1];
    if (videoId) {
      return <iframe className="h-full w-full rounded shadow-sm min-h-[200px]" src={`https://www.youtube.com/embed/${videoId}?mute=0`} title="YouTube" frameBorder="0" allowFullScreen />;
    }
  }

  if (cleanUrl.includes('tiktok.com')) {
    const videoIdMatch = url.match(/\/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;
    const photoIdMatch = url.match(/\/photo\/(\d+)/);
    const photoId = photoIdMatch ? photoIdMatch[1] : null;
    const usernameMatch = url.match(/@([^/?]+)/);
    const username = usernameMatch ? usernameMatch[1] : '';

    // Video: tikwm upgrade → native player; embed/v2 as fallback
    if (videoId) {
      if (tikTokMp4) {
        return <video src={tikTokMp4} controls className="h-full w-full min-h-[250px] object-contain rounded shadow-sm bg-black" />;
      }
      return (
        <div className="relative w-full h-full min-h-[350px] bg-black rounded shadow-sm flex flex-col">
          <iframe
            className="flex-grow w-full rounded-t bg-black"
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            style={{ border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    // Photo/carousel: thumbnail in card, full carousel in modal on click
    if (photoId) {
      if (onOpenModal) {
        return (
          <div
            className="w-full h-full flex items-center justify-center cursor-pointer relative group rounded overflow-hidden"
            onClick={() => onOpenModal(url)}
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt="TikTok carousel" className="h-full w-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-900 rounded flex flex-col items-center justify-center text-white gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.53V6.77a4.85 4.85 0 0 1-1.01-.08z"/>
                </svg>
                <span className="text-sm text-gray-300">@{username}</span>
                <span className="text-xs text-gray-400">Photo carousel</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white font-medium text-sm bg-black/70 px-4 py-2 rounded-full">
                View carousel
              </span>
            </div>
          </div>
        );
      }

      return (
        <div className="w-full h-full overflow-hidden flex justify-center">
          <blockquote
            className="tiktok-embed"
            cite={url}
            data-video-id={photoId}
            style={{ maxWidth: '605px', minWidth: '325px' }}
          >
            <section>
              <a href={url} target="_blank" rel="noopener noreferrer">@{username}</a>
            </section>
          </blockquote>
        </div>
      );
    }

    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded text-center text-sm border border-gray-200 dark:border-gray-600 w-full h-full flex flex-col justify-center items-center">
        <p className="font-bold mb-1 text-yellow-600">Embed Unavailable</p>
        <a href={url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Open in TikTok</a>
      </div>
    );
  }

  return <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all text-sm">{url}</a>;
};

const TikTokPhotoModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const photoIdMatch = url.match(/\/photo\/(\d+)/);
  const photoId = photoIdMatch ? photoIdMatch[1] : null;
  const usernameMatch = url.match(/@([^/?]+)/);
  const username = usernameMatch ? usernameMatch[1] : '';

  useEffect(() => {
    reloadTikTokScript();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!photoId) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full mx-4 overflow-auto"
        style={{ maxWidth: '680px', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex justify-end p-2 bg-gray-900/80 backdrop-blur-sm rounded-t-xl">
          <button
            onClick={onClose}
            className="bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-black transition-colors leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="p-4 flex justify-center">
          <blockquote
            className="tiktok-embed"
            cite={url}
            data-video-id={photoId}
            style={{ maxWidth: '605px', minWidth: '325px' }}
          >
            <section>
              <a href={url} target="_blank" rel="noopener noreferrer">@{username}</a>
            </section>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

const InfoModal = ({ row, onClose }: { row: any; onClose: () => void }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const entries = Object.entries(row).filter(([key]) => key !== '_id' && key !== '_originalIndex');

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full mx-4 overflow-auto"
        style={{ maxWidth: '680px', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 bg-gray-900 rounded-t-xl">
          <span className="text-white text-sm font-medium">Row #{row._originalIndex + 1} Info</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none cursor-pointer transition-colors">×</button>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {entries.map(([key, val]) => (
            <div key={key} className="text-sm">
              <span className="font-bold text-gray-900 dark:text-gray-100">{key}</span>
              <span className="text-gray-600 dark:text-gray-300">: {String(val ?? '')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
// -------------------------------------------


export default function MediaCheckerDashboard() {
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [titleColumn, setTitleColumn] = useState('');
  const [jumpToRow, setJumpToRow] = useState('');
  
  // State for Filters
  const [faultyFilter, setFaultyFilter] = useState<'all' | 'faulty' | 'non-faulty'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [modalPhotoUrl, setModalPhotoUrl] = useState<string | null>(null);
  const [modalInfoRow, setModalInfoRow] = useState<any>(null);
  const [pinnedRow, setPinnedRow] = useState<{ filteredIdx: number; label: string } | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [drillColumn, setDrillColumn] = useState('');
  const [drillOpenGroups, setDrillOpenGroups] = useState<Set<string>>(new Set());

  // remarksRef holds remark text — writing to it never triggers a re-render
  const remarksRef = useRef({});

  const virtuosoRef = useRef<any>(null);
  const currentFirstIndex = useRef(0);

  const columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== '_id' && k !== '_originalIndex') : [];
  const activeTitleColumn = titleColumn || columns[0] || '';

  const parseBoolean = (val) => {
    if (val === true || val === false) return val;
    if (typeof val === 'string') {
      const lower = val.toLowerCase().trim();
      if (lower === 'true' || lower === 'yes' || lower === '1') return true;
      if (lower === 'false' || lower === 'no' || lower === '0') return false;
    }
    if (typeof val === 'number') {
      return val === 1;
    }
    return false;
  };

  const normalizeData = (rawData) => {
    return rawData.map((row, idx) => {
      const rawFaulty = row.isFaulty !== undefined ? row.isFaulty :
                        row.IS_FAULTY !== undefined ? row.IS_FAULTY :
                        row.is_faulty !== undefined ? row.is_faulty : false;

      const rawRemark = row.remark !== undefined ? row.remark :
                        row.REMARK !== undefined ? row.REMARK :
                        row.Remark !== undefined ? row.Remark : '';

      return {
        ...row,
        _id: Math.random().toString(36).substr(2, 9) + idx, 
        _originalIndex: idx,
        isFaulty: parseBoolean(rawFaulty),
        remark: rawRemark
      };
    });
  };

  // Seed remarksRef when data first loads
  useEffect(() => {
    if (data.length === 0) return;
    data.forEach(row => {
      if (!(row._id in remarksRef.current)) {
        remarksRef.current[row._id] = row.remark ?? '';
      }
    });
  }, [data]);


  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    setUploadedFileName(file.name);

    if (fileExtension === 'csv' || fileExtension === 'txt') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => setData(normalizeData(results.data)),
        error: (error) => {
          console.error("Error parsing CSV:", error);
          alert("Failed to parse the file.");
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target.result;
          const workbook = XLSX.read(buffer, { type: 'binary' });
          const json = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
          setData(normalizeData(json));
        } catch (error) {
          console.error("Error parsing Excel:", error);
          alert("Failed to parse the Excel file.");
        }
      };
      reader.readAsBinaryString(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    }
  });

  const getMediaUrl = (row) => row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || '';

  const handleFaultyChange = useCallback((id, isChecked) => {
    setData(prev => prev.map(row => row._id === id ? { ...row, isFaulty: isChecked } : row));
  }, []);


  // On blur, flush into data state (for filter logic / export) — only one row re-renders
  const handleRemarkBlur = useCallback((id) => {
    const text = remarksRef.current[id] ?? '';
    setData(prev => prev.map(row => row._id === id ? { ...row, remark: text } : row));
  }, []);

  const handleExportXLSX = () => {
    if (data.length === 0) return alert("No data to export!");
    const exportData = data.map(({ _id, _originalIndex, ...rest }) => ({
      ...rest,
      remark: remarksRef.current[_id] ?? rest.remark,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    XLSX.writeFile(workbook, `${uploadedFileName.replace(/\.[^/.]+$/, '') || 'media-checker-export'}.xlsx`);
  };

  const handleRemoveFile = () => {
    setData([]);
    setUploadedFileName('');
    setPinnedRow(null);
    remarksRef.current = {};
    setFaultyFilter('all');
    setTitleColumn('');
    setJumpToRow('');
  };

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      if (faultyFilter === 'faulty') return row.isFaulty;
      if (faultyFilter === 'non-faulty') return !row.isFaulty;
      return true;
    }).filter((row) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return Object.entries(row).some(([key, val]) => {
        if (key === '_id' || key === '_originalIndex') return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [data, faultyFilter, searchQuery]);

  const drillGroups = React.useMemo(() => {
    if (filteredData.length === 0) return [];
    const col = drillColumn || Object.keys(filteredData[0]).find(k => k !== '_id' && k !== '_originalIndex') || '';
    if (!col) return [];
    const map: Record<string, { row: any; filteredIdx: number }[]> = {};
    filteredData.forEach((row, idx) => {
      const key = String((row as any)[col] ?? '(Empty)');
      if (!map[key]) map[key] = [];
      map[key].push({ row, filteredIdx: idx });
    });
    return Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, items]) => ({ name, items }));
  }, [filteredData, drillColumn]);

  const handleJumpSubmit = (e) => {
    e.preventDefault();
    const rowIndex = parseInt(jumpToRow, 10);
    
    if (!isNaN(rowIndex) && rowIndex > 0 && rowIndex <= data.length) {
      const filteredIndex = filteredData.findIndex(r => r._originalIndex === rowIndex - 1);
      
      if (filteredIndex !== -1) {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({
            index: filteredIndex,
            align: 'center',
            behavior: 'smooth'
          });
        }
      } else {
        alert(`Row ${rowIndex} is currently hidden by your active filters.`);
      }
    } else {
      alert(`Please enter a valid row number between 1 and ${data.length}`);
    }
  };

  const faultyCount = data.filter(row => row.isFaulty).length;
  const faultyPercentage = data.length ? Math.round((faultyCount / data.length) * 100) : 0;

  // Stable item renderer — defined outside JSX so Virtuoso never sees a new function reference
  // and never remounts rows on re-render (which would steal focus from the textarea)
  const tableItemContent = useCallback((_index, row) => (
    <>
      <td className="p-4 text-sm text-gray-500 dark:text-gray-400 align-top">
        <div className="flex flex-col items-center gap-2">
          <span>{row._originalIndex + 1}</span>
          <button
            onClick={() => setPinnedRow({ filteredIdx: _index, label: `CSV #${row._originalIndex + 1}` })}
            className="text-gray-400 hover:text-yellow-500 transition-all cursor-pointer rounded p-1 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 active:scale-90 text-base leading-none"
            title="Pin this row"
          >
            📌
          </button>
        </div>
      </td>
      <td className="p-4 align-top w-[500px]">
        <div className="h-48 overflow-hidden">
          <MediaRenderer url={row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''} onOpenModal={setModalPhotoUrl} />
        </div>
      </td>
      <td className="p-4 align-top">
        <div className="flex flex-col gap-2">
          <textarea
            defaultValue={remarksRef.current[row._id] ?? row.remark}
            onChange={(e) => { remarksRef.current[row._id] = e.target.value; }}
            onBlur={() => handleRemarkBlur(row._id)}
            placeholder="Add a remark..."
            className="w-full p-2 text-sm border rounded bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[100px]"
          />
          <a
            href={row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:text-blue-600 hover:underline break-all line-clamp-2"
          >
            {String.fromCodePoint(0x1F517)} {row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''}
          </a>
        </div>
      </td>
      <td className="p-4 align-top text-center">
        <input
          type="checkbox"
          defaultChecked={row.isFaulty}
          onChange={(e) => handleFaultyChange(row._id, e.target.checked)}
          className="w-6 h-6 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
        />
      </td>
    </>
  ), [handleFaultyChange, handleRemarkBlur]);

  const gridItemContent = useCallback((_index, row) => (
    <div className="flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm h-[440px]">
      <div className="flex-grow p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden relative">
        <button
          onClick={() => setPinnedRow({ filteredIdx: _index, label: `CSV #${row._originalIndex + 1}` })}
          className="absolute top-2 left-2 z-10 bg-black/50 hover:bg-black/75 text-white text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors cursor-pointer"
          title="Pin this row"
        >
          📌 #{row._originalIndex + 1}
        </button>
        <button
          onClick={() => setModalInfoRow(row)}
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/75 text-white text-xs px-2 py-1 rounded transition-colors cursor-pointer"
        >
          Show Info
        </button>
        <MediaRenderer url={row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''} onOpenModal={setModalPhotoUrl} />
      </div>
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
        <div className="font-medium text-sm text-gray-800 dark:text-gray-100 truncate" title={row[activeTitleColumn]}>
          {row[activeTitleColumn] || <span className="text-gray-400 italic">No title</span>}
        </div>
        <textarea
          defaultValue={remarksRef.current[row._id] ?? row.remark}
          onChange={(e) => { remarksRef.current[row._id] = e.target.value; }}
          onBlur={() => handleRemarkBlur(row._id)}
          placeholder="Add a remark..."
          className="w-full p-2 text-xs border rounded bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none h-14"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              defaultChecked={row.isFaulty}
              onChange={(e) => handleFaultyChange(row._id, e.target.checked)}
              className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
            />
            Faulty
          </label>
          <a
            href={row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-500 hover:underline truncate max-w-[120px]"
          >
            🔗 Direct Link
          </a>
        </div>
      </div>
    </div>
  ), [activeTitleColumn, handleFaultyChange, handleRemarkBlur]);

  const toggleDrillGroup = useCallback((name: string) => {
    setDrillOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-8 transition-colors duration-200">

        {/* App Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 mb-5">
          <div className="max-w-screen-2xl mx-auto px-6 py-3 flex items-center justify-between">
            <h1 className="text-base font-semibold tracking-tight text-gray-800 dark:text-gray-100">Media QC</h1>
            <button onClick={() => setDarkMode(!darkMode)} className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>

        <div className="max-w-screen-2xl mx-auto px-6">

          {/* File Upload Zone / Stats Row */}
          {data.length === 0 ? (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors mb-5 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-gray-700' : 'border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <input {...getInputProps()} />
              <UploadCloud className="mx-auto h-8 w-8 text-blue-500 mb-3" />
              <p className="font-medium mb-1">Drag file here or click to upload</p>
              <p className="text-sm text-gray-400">Supports CSV, TXT, and XLSX files</p>
            </div>
          ) : (
            <div className="flex items-stretch gap-3 mb-4">
              {/* File name */}
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-3.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <UploadCloud size={15} className="text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{uploadedFileName}</span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="ml-4 px-3 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>

              {/* Total Rows */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-3.5 flex flex-col justify-center gap-0.5 min-w-[130px]">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Total Rows</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">{data.length}</span>
                  {filteredData.length !== data.length && (
                    <span className="text-blue-500 text-xs">({filteredData.length} shown)</span>
                  )}
                </div>
              </div>

              {/* Faulty Rows */}
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-5 py-3.5 flex flex-col justify-center gap-0.5 min-w-[130px]">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Faulty Rows</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">{faultyCount}</span>
                  <span className="text-gray-400 text-xs">({faultyPercentage}%)</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Column Selectors */}
          <div className="flex flex-wrap items-center gap-3 mb-3 bg-white dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <form
              onSubmit={(e) => { e.preventDefault(); setSearchQuery(searchInput); }}
              className="flex bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 overflow-hidden flex-grow max-w-md"
            >
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Enter keyword and press Enter"
                className="p-2 w-full outline-none text-sm bg-transparent"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearchQuery(''); }}
                  className="px-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                >
                  ×
                </button>
              )}
              <button type="submit" className="bg-blue-600 p-2 text-white px-4 hover:bg-blue-700">
                <Search size={18} />
              </button>
            </form>
            
            {/* LIVE FILTERS */}
            <div className="flex items-center gap-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['all', 'faulty', 'non-faulty'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFaultyFilter(opt)}
                  className={`px-3 py-1 rounded-md text-sm transition-colors cursor-pointer ${
                    faultyFilter === opt
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  {opt === 'all' ? 'All' : opt === 'faulty' ? 'Faulty' : 'Non-Faulty'}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-sm ml-auto">
              <span className="text-gray-600 dark:text-gray-400">Grid Title:</span>
              <select 
                className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 outline-none max-w-[150px] truncate"
                value={activeTitleColumn}
                onChange={(e) => setTitleColumn(e.target.value)}
                disabled={columns.length === 0}
              >
                {columns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">Render Media:</span>
              <select className="border border-gray-300 dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 outline-none">
                <option>CREATIVE_URL_SUPPLIER</option>
              </select>
            </div>
          </div>

          {/* Action Row & View Toggles */}
          <div className="flex flex-wrap items-center gap-3 mb-3 text-sm">
            {/* VIEW MODE TOGGLE */}
            <div className="ml-4 flex rounded overflow-hidden border border-blue-600">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-1.5 flex items-center gap-2 transition-colors ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <List size={16} /> Table
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-1.5 flex items-center gap-2 transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <LayoutGrid size={16} /> Grid
              </button>
              <button
                onClick={() => { setViewMode('drill'); setDrillOpenGroups(new Set()); }}
                className={`px-4 py-1.5 flex items-center gap-2 transition-colors ${viewMode === 'drill' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <ChevronDown size={16} /> Drill
              </button>
            </div>

            {/* DRILL BY SELECTOR */}
            {viewMode === 'drill' && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Drill by:</span>
                <select
                  value={drillColumn || columns[0] || ''}
                  onChange={(e) => { setDrillColumn(e.target.value); setDrillOpenGroups(new Set()); }}
                  className="border border-gray-300 dark:border-gray-600 rounded p-1.5 bg-white dark:bg-gray-700 outline-none max-w-[200px] truncate"
                >
                  {columns.map(col => <option key={col} value={col}>{col}</option>)}
                </select>
              </div>
            )}

            {/* GO TO ROW FEATURE */}
            {data.length > 0 && (
              <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 ml-4">
                <span className="text-gray-600 dark:text-gray-400">Go to CSV row:</span>
                <input 
                  type="number" 
                  min="1" 
                  max={data.length}
                  value={jumpToRow}
                  onChange={(e) => setJumpToRow(e.target.value)}
                  className="w-16 p-1 text-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 outline-none focus:border-blue-500"
                  placeholder="#"
                />
                <button type="submit" className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-3 py-1 rounded transition-colors">
                  Go
                </button>
              </form>
            )}

            {/* JUMP TO PIN */}
            {pinnedRow && (
              <button
                onClick={() => virtuosoRef.current?.scrollToIndex({ index: pinnedRow.filteredIdx, align: 'start', behavior: 'smooth' })}
                className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/50 border border-blue-300 dark:border-blue-700 px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                📍 Jump to {pinnedRow.label}
              </button>
            )}

            {/* EXPORT BUTTON */}
            <button onClick={handleExportXLSX} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded flex items-center gap-2 transition-colors ml-auto">
              <Download size={16} /> Export Data
            </button>
          </div>

          {/* DATA VIEW AREA */}
          {data.length === 0 ? (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
               Upload a file to view the data.
             </div>
          ) : filteredData.length === 0 ? (
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center text-gray-500">
               No rows match your current filters.
             </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: '750px' }}>
              
              {/* TABLE VIEW */}
              {viewMode === 'table' && (
                <TableVirtuoso
                  ref={virtuosoRef}
                  data={filteredData}
                  rangeChanged={(range) => { currentFirstIndex.current = range.startIndex; }}
                  fixedHeaderContent={() => (
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                      <th className="p-4 text-sm font-medium text-gray-600 dark:text-gray-400 w-16">#</th>
                      <th className="p-4 text-sm font-medium text-gray-600 dark:text-gray-400">media (CREATIVE_URL_SUPPLIER)</th>
                      <th className="p-4 text-sm font-medium text-gray-600 dark:text-gray-400">remark</th>
                      <th className="p-4 text-sm font-medium text-gray-600 dark:text-gray-400 w-32">isFaulty</th>
                    </tr>
                  )}
                  itemContent={tableItemContent}
                  components={{
                    Table: ({ style, ...props }) => <table {...props} className="w-full text-left border-collapse" style={{ ...style, width: '100%' }} />,
                    TableRow: (props) => <tr {...props} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors" />
                  }}
                />
              )}

              {/* GRID VIEW */}
              {viewMode === 'grid' && (
                <VirtuosoGrid
                  ref={virtuosoRef}
                  data={filteredData}
                  rangeChanged={(range) => { currentFirstIndex.current = range.startIndex; }}
                  listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 p-6"
                  itemContent={gridItemContent}
                />
              )}

              {/* DRILL VIEW */}
              {viewMode === 'drill' && (
                <div className="overflow-auto h-full">
                  {drillGroups.map(({ name, items }) => (
                    <div key={name} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <button
                        onClick={() => toggleDrillGroup(name)}
                        className="sticky top-0 z-20 w-full flex items-center gap-3 px-6 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 transition-colors text-left shadow-sm"
                      >
                        {drillOpenGroups.has(name)
                          ? <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />
                          : <ChevronRight size={16} className="flex-shrink-0 text-gray-400" />
                        }
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{name}</span>
                        <span className="text-gray-400 text-sm ml-1">({items.length})</span>
                      </button>
                      {drillOpenGroups.has(name) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                          {items.map(({ row, filteredIdx }) => (
                            <React.Fragment key={row._id}>
                              {gridItemContent(filteredIdx, row)}
                            </React.Fragment>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

      {modalPhotoUrl && (
        <TikTokPhotoModal url={modalPhotoUrl} onClose={() => setModalPhotoUrl(null)} />
      )}
      {modalInfoRow && (
        <InfoModal row={modalInfoRow} onClose={() => setModalInfoRow(null)} />
      )}
      </div>
    </div>
  );
}