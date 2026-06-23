'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Search, Moon, Sun, Download, LayoutGrid, List } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { TableVirtuoso, VirtuosoGrid } from 'react-virtuoso';

// --- Smart Media Renderer ---
const MediaRenderer = ({ url }) => {
  const [tikTokMp4, setTikTokMp4] = useState(null);
  const [loadingTikTok, setLoadingTikTok] = useState(false);

  useEffect(() => {
    const cleanUrl = url?.toLowerCase().split('?')[0] || '';
    
    if (cleanUrl.includes('tiktok.com')) {
      setLoadingTikTok(true);
      fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
          if (data?.data?.play) {
            setTikTokMp4(data.data.play);
          }
        })
        .catch(err => {
          console.warn("API proxy failed, falling back to official iframe");
        })
        .finally(() => setLoadingTikTok(false));
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
    if (loadingTikTok) {
      return <div className="h-full w-full min-h-[250px] bg-gray-200 dark:bg-gray-700 animate-pulse rounded flex items-center justify-center text-xs text-gray-500 shadow-sm">Loading...</div>;
    }
    if (tikTokMp4) {
      return <video src={tikTokMp4} controls className="h-full w-full min-h-[250px] object-contain rounded shadow-sm bg-black" />;
    }

    const videoIdMatch = url.match(/video\/(\d+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (videoId) {
      return (
        <div className="relative w-full h-full min-h-[350px] bg-black rounded shadow-sm flex flex-col">
          <iframe 
            className="flex-grow w-full rounded-t bg-black"
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            frameBorder="0"
            // The magic attributes required to unfreeze the TikTok player:
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-top-navigation allow-same-origin"
            allowFullScreen
          />
          <a href={url} target="_blank" rel="noreferrer" className="bg-gray-800 text-gray-300 text-xs p-1.5 text-center hover:bg-gray-700 hover:text-white rounded-b transition-colors border-t border-gray-700">
            If frozen, click to open in TikTok ↗
          </a>
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
// -------------------------------------------


export default function MediaCheckerDashboard() {
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [titleColumn, setTitleColumn] = useState('');
  const [jumpToRow, setJumpToRow] = useState('');
  
  // State for Filters
  const [filterFaulty, setFilterFaulty] = useState(false);
  const [filterNonFaulty, setFilterNonFaulty] = useState(false);

  // remarksRef holds remark text — writing to it never triggers a re-render
  const remarksRef = useRef({});

  const virtuosoRef = useRef(null);

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

  // --- NEW EXCEL EXPORT FUNCTION ---
  const handleExportExcel = () => {
    if (data.length === 0) return alert("No data to export!");
    
    // 1. Prepare the data (stripping out our internal _id and _originalIndex)
    const exportData = data.map(({ _id, _originalIndex, ...rest }) => ({
      ...rest,
      remark: remarksRef.current[_id] ?? rest.remark,
    }));

    // 2. Convert the JSON data to an Excel worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // 3. Create a new workbook and add the worksheet to it
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Media Checker Data");
    
    // 4. Trigger the download automatically
    XLSX.writeFile(workbook, 'media-checker-export.xlsx');
  };

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      if (filterFaulty && !filterNonFaulty) return row.isFaulty;
      if (!filterFaulty && filterNonFaulty) return !row.isFaulty;
      return true;
    });
  }, [data, filterFaulty, filterNonFaulty]);

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
        {row._originalIndex + 1}
      </td>
      <td className="p-4 align-top w-[500px]">
        <div className="h-48 overflow-hidden">
          <MediaRenderer url={row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''} />
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
        <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10">#{row._originalIndex + 1}</div>
        <MediaRenderer url={row.CREATIVE_URL_SUPPLIER || row.creative_url_supplier || row.url || row.media || ''} />
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

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans pb-12 transition-colors duration-200">
        
        {/* Header / Dark Mode Toggle */}
        <div className="flex justify-end p-6 max-w-7xl mx-auto">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          
          {/* File Upload Zone */}
          <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-16 text-center cursor-pointer transition-colors mb-8 ${darkMode ? 'bg-gray-800' : 'bg-white'} ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-gray-700' : 'border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
            <input {...getInputProps()} />
            <UploadCloud className="mx-auto h-10 w-10 text-blue-500 mb-4" />
            <p className="font-medium mb-1">Drag file here or click to upload</p>
            <p className="text-sm text-gray-400">Supports CSV, TXT, and XLSX files</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold mb-2">Total Rows</h3>
                <p className="text-2xl">{data.length}</p>
              </div>
              {filteredData.length !== data.length && (
                <div className="text-right text-sm text-blue-500 font-medium">
                  Showing {filteredData.length} filtered
                </div>
              )}
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold mb-2">Faulty Rows</h3>
              <p className="text-2xl">{faultyCount} ({faultyPercentage}%)</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
              <h3 className="text-sm font-bold mb-2">Faulty Impressions</h3>
              <p className="text-2xl">—</p>
            </div>
          </div>

          {/* Filters & Column Selectors */}
          <div className="flex flex-wrap items-center gap-4 mb-6 bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex bg-white dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-600 overflow-hidden flex-grow max-w-md">
              <input type="text" placeholder="Enter keyword and press Enter" className="p-2 w-full outline-none text-sm bg-transparent"/>
              <button className="bg-blue-600 p-2 text-white px-4 hover:bg-blue-700"><Search size={18} /></button>
            </div>
            
            {/* LIVE FILTERS */}
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={filterFaulty}
                onChange={(e) => setFilterFaulty(e.target.checked)}
                className="rounded bg-transparent cursor-pointer w-4 h-4 text-blue-600" 
              /> 
              Faulty
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={filterNonFaulty}
                onChange={(e) => setFilterNonFaulty(e.target.checked)}
                className="rounded bg-transparent cursor-pointer w-4 h-4 text-blue-600" 
              /> 
              Non-Faulty
            </label>
            
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
          <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
            <span className="text-gray-700 dark:text-gray-300">Faulty Selection Mode:</span>
            <button className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-600">Legacy</button>
            <button className="text-gray-500 hover:text-gray-900 dark:hover:text-white px-2 transition-colors">Advanced</button>
            
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
            </div>

            <button className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 px-4 py-1.5 rounded flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-600">Drill</button>
            
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

            {/* EXCEL EXPORT BUTTON */}
            <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded flex items-center gap-2 transition-colors ml-auto">
              <Download size={16} /> Export to Excel
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
                  listClassName="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6"
                  itemContent={gridItemContent}
                />
              )}

            </div>
          )}

        </div>
      </div>
    </div>
  );
}