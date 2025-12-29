import React, { useState, useMemo } from 'react';
import { 
  Upload, 
  FileText, 
  BarChart2, 
  Plus, 
  Trash2, 
  Download, 
  Search,
  Filter,
  PieChart,
  ChevronDown,
  X,
  Table,
  Tag,
  CheckCircle,
  Calendar
} from 'lucide-react';
import './index.css'

// Type definitions
interface Rule {
  id: number;
  name: string;
  keywords: string[];
  color: string;
}

interface ParsedData {
  headers: string[];
  data: Record<string, string>[];
}

interface ProcessedRow extends Record<string, string> {
  Category: string;
  Matched_Keywords: string;
  Month_Year: string;
}

interface AnalysisResult {
  total: number;
  distribution: [string, number][];
  categorization: Record<string, number>;
}

// --- Helper: Robust CSV Parser ---
const parseCSV = (text: string): ParsedData => {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField);
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
         rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0] !== '')) {
        rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], data: [] };

  const headers = rows[0].map(h => h.trim());
  
  const data = rows.slice(1).map(row => {
    return headers.reduce((obj, header, index) => {
      (obj as Record<string, string>)[header] = row[index] ? row[index].trim() : ''; 
      return obj;
    }, {} as Record<string, string>);
  });

  return { headers, data };
};

// --- Helper: CSV Exporter ---
const exportToCSV = (data: ProcessedRow[], headers: string[], filename = 'categorized_testimonies.csv'): void => {
  const exportHeaders = ['Category', 'Matched_Keywords', 'Month_Year', ...headers];
  
  const csvContent = [
    exportHeaders.join(','),
    ...data.map(row => exportHeaders.map(fieldName => {
      const val = row[fieldName] ? String(row[fieldName]).replace(/"/g, '""') : '';
      return `"${val}"`;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  disabled?: boolean;
}) => {
  const baseStyle = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 text-sm";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 active:transform active:scale-95",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const MetricCard = ({ title, value, subtext, icon: Icon, color = "text-indigo-600 bg-indigo-50" }: {
  title: string;
  value: number | undefined;
  subtext?: string;
  icon: React.ComponentType<{ size?: number }>;
  color?: string;
}) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-slate-500 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtext && <p className="text-slate-400 text-xs mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon size={20} />
    </div>
  </div>
);

export default function App() {
  const [fileData, setFileData] = useState<Record<string, string>[] | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [dateColumn, setDateColumn] = useState<string>('');
  const [view, setView] = useState<'upload' | 'analyze' | 'data'>('upload'); 
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>('All Time');
  
  // SCORING BASED RULES
  const [rules, setRules] = useState<Rule[]>([
    { 
        id: 1, 
        name: 'Salvation', 
        keywords: [
            'salvation', 'born again', 'rededicate', 'accept jesus', 'accepted jesus', 
            'accept christ', 'accepted christ', 'give my life', 'gave my life', 
            'surrender', 'soul saved', 'altar call', 'holy spirit', 'baptism', 
            'tongues', 'repent', 'sinner', 'convert', 'preach', 'evangelism', 'believer'
        ], 
        color: 'bg-purple-500' 
    },
    { 
        id: 2, 
        name: 'Healings/Fruit of the Womb', 
        keywords: [
            'heal', 'health', 'doctor', 'pain', 'cancer', 'surgery', 'sick', 'illness', 
            'diagnos', 'hospital', 'cured', 'blood', 'operation', 'growth', 'lump', 
            'womb', 'baby', 'child', 'pregnant', 'conceive', 'conception', 'delivery', 
            'safe delivery', 'put to bed', 'fruit of the womb', 'barren', 'fibroid', 
            'cycle', 'menstruation', 'genotype', 'aa', 'ss', 'infection', 'disease', 
            'medication', 'drug', 'treatment', 'test result', 'negative', 'miscarriage',
            'body pain', 'headache', 'stomach', 'leg pain', 'restored health'
        ], 
        color: 'bg-red-500' 
    },
    { 
        id: 3, 
        name: 'Financial Miracles', 
        keywords: [
            'money', 'debt', 'naira', 'dollar', 'credit', 'alert', 'paid', 'fund', 
            'fee', 'rent', 'financial', 'provision', 'supply', 'account', 'bank', 
            'transfer', 'sum', 'amount', 'salary', 'increase', 'capital', 'support', 
            'favour', 'favor', 'bless', 'gift', 'dash', 'sent me', 'provide', 
            'bought', 'buy', 'sell', 'landlord', 'house rent', 'school fee', 
            'tuition', 'scholarship', 'grant', 'loan', 'clear', 'owed', 'owing', 
            'miracle money', 'seed', 'tithe', 'sow', 'harvest', 'lack', 'wealth',
            'bed', 'furniture', 'item', 'laptop', 'phone', 'car', 'iphone', 'device'
        ], 
        color: 'bg-green-500' 
    },
    { 
        id: 4, 
        name: 'Academic and Career Upgrade', 
        keywords: [
            'job', 'work', 'employ', 'promote', 'interview', 'business', 'sales', 
            'customer', 'office', 'contract', 'appointment', 'shop', 'trade', 
            'school', 'exam', 'admission', 'university', 'result', 'grade', 
            'student', 'project', 'graduate', 'degree', 'jamb', 'waec', 'promotion', 
            'upgrade', 'career', 'academic', 'nysc', 'visa', 'immigration', 'abroad', 
            'relocate', 'uk', 'canada', 'usa', 'travel', 'passport', 'embassy', 
            'cv', 'resume', 'application', 'offer letter', 'hired', 'vacancy', 'pop'
        ], 
        color: 'bg-blue-500' 
    },
    { 
        id: 5, 
        name: 'Protection and Deliverance', 
        keywords: [
            'accident', 'safe', 'protect', 'escape', 'death', 'robbery', 'thief', 
            'thieves', 'robbed', 'stole', 'crash', 'police', 'saved from', 'rescue', 
            'deliver', 'attack', 'oppress', 'nightmare', 'witch', 'demon', 'safety', 
            'kidnap', 'gun', 'bullet', 'armed', 'ritual', 'charm', 'poison', 
            'collision', 'vehicle', 'fire', 'burn', 'alive', 'survive',
            'birthday', 'plus one', 'another year', 'new year', 'age', 'journey', 
            'trip', 'travelled', 'road', 'arrive', 'arrived'
        ], 
        color: 'bg-orange-500' 
    }
  ]);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleKeywords, setNewRuleKeywords] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;
      const { headers, data } = parseCSV(text);
      setHeaders(headers);
      setFileData(data);
      
      // Smart Column Detection
      const likelyColumn = headers.find(h => 
        h.toLowerCase().includes('narrate') || 
        h.toLowerCase().includes('share your testimony') || 
        h.toLowerCase().includes('detail')
      );
      
      if (likelyColumn) setSelectedColumn(likelyColumn);
      else if (headers.length > 0) setSelectedColumn(headers[0]);
      
      // Smart Date Detection
      const likelyDate = headers.find(h => 
        h.toLowerCase().includes('date') || 
        h.toLowerCase().includes('submission started') ||
        h.toLowerCase().includes('timestamp')
      );
      if (likelyDate) setDateColumn(likelyDate);

      setView('analyze');
    };
    reader.readAsText(file);
  };

  // --- 1. Processing Data (Categorization + Date Extraction) ---
  const { processedData, activeColumns, availableMonths } = useMemo(() => {
    if (!fileData) return { processedData: [] as ProcessedRow[], activeColumns: [] as string[], availableMonths: [] as string[] };

    // Identify target columns for text scan
    const targetPhrases = [
      'share your testimony in details',
      'what was the case before now',
      'narrate what happened to you in this meeting',
      'what was the condition before now'
    ];
    
    const activeCols = headers.filter(h => 
      targetPhrases.some(phrase => h.toLowerCase().includes(phrase))
    );

    const monthsSet = new Set<string>();

    const processed = fileData.map(row => {
        // --- Categorization Logic ---
        let textToScan = '';
        if (activeCols.length > 0) {
          textToScan = activeCols.map(col => row[col] || '').join(' ').toLowerCase();
        } else {
          textToScan = Object.values(row).join(' ').toLowerCase();
        }

        let bestCategory = 'Others';
        let maxScore = 0;
        const matchedKeywords: string[] = [];

        rules.forEach(rule => {
            let score = 0;
            rule.keywords.forEach(k => {
                if (textToScan.includes(k.toLowerCase())) {
                    score++;
                    matchedKeywords.push(k);
                }
            });

            if (score > maxScore) {
                maxScore = score;
                bestCategory = rule.name;
            }
        });

        // --- Date Logic ---
        let monthYear = 'Unknown';
        if (dateColumn && row[dateColumn]) {
            try {
                // Handle various date formats including "Sun Apr 06 2025..."
                const dateObj = new Date(row[dateColumn]);
                if (!isNaN(dateObj.getTime())) {
                    monthYear = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
                    monthsSet.add(monthYear);
                }
            } catch {
                // Ignore parse errors
            }
        }
        
        return {
            ...row,
            Category: bestCategory,
            Matched_Keywords: [...new Set(matchedKeywords)].join(', '),
            Month_Year: monthYear
        };
    });

    // Sort months chronologically
    const sortedMonths = Array.from(monthsSet).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateA.getTime() - dateB.getTime();
    });

    return { 
        processedData: processed,
        activeColumns: activeCols,
        availableMonths: sortedMonths
    };
  }, [fileData, dateColumn, rules, headers]);

  // --- 2. Analysis Calculation (Affected by Month Filter) ---
  const analysis = useMemo((): AnalysisResult | null => {
    if (!processedData.length) return null;

    // Filter by Date
    let dataToAnalyze = processedData;
    if (selectedMonth !== 'All Time') {
        dataToAnalyze = processedData.filter(d => d.Month_Year === selectedMonth);
    }

    const total = dataToAnalyze.length;
    const distribution: Record<string, number> = {};
    const categorization: Record<string, number> = {
      Others: 0 
    };
    rules.forEach(r => categorization[r.name] = 0);
    
    dataToAnalyze.forEach(row => {
        // Update categorization counts
        categorization[row.Category] = (categorization[row.Category] || 0) + 1;

        // Update phrase stats (based on selected preview column)
        const specificVal = (row as Record<string, string>)[selectedColumn] || '';
        const key = specificVal.trim().length > 50 ? specificVal.substring(0, 47) + '...' : (specificVal.trim() || '(Empty)');
        distribution[key] = (distribution[key] || 0) + 1;
    });

    const sortedDist = Object.entries(distribution)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); 

    return { total, distribution: sortedDist, categorization };
  }, [processedData, selectedMonth, selectedColumn, rules]);

  // --- 3. Filtered Data for Table ---
  const filteredData = useMemo(() => {
      if (!processedData) return [];
      let data = processedData;
      
      // Filter by Month
      if (selectedMonth !== 'All Time') {
          data = data.filter(d => d.Month_Year === selectedMonth);
      }
      
      // Filter by Category
      if (filterCategory !== 'All') {
          data = data.filter(d => d.Category === filterCategory);
      }
      return data;
  }, [processedData, filterCategory, selectedMonth]);

  const addRule = () => {
    if (!newRuleName || !newRuleKeywords) return;
    const keywords = newRuleKeywords.split(',').map(k => k.trim()).filter(k => k);
    setRules([...rules, {
      id: Date.now(),
      name: newRuleName,
      keywords,
      color: 'bg-slate-500'
    }]);
    setNewRuleName('');
    setNewRuleKeywords('');
  };

  const removeRule = (id: number) => {
    setRules(rules.filter(r => r.id !== id));
  };

  if (view === 'upload') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-xl w-full">
          <div className="text-center mb-10">
            <div className="bg-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200">
              <FileText className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">GLT Testimony Analytics</h1>
            <p className="text-slate-500">Upload your GLT Testimony CSV file to see the analytics.</p>
          </div>

          <Card className="p-8 border-dashed border-2 border-slate-300 hover:border-indigo-500 transition-colors cursor-pointer bg-slate-50 hover:bg-indigo-50/50 group">
            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
              <div className="mb-4 p-4 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform">
                <Upload className="text-indigo-600" size={32} />
              </div>
              <span className="text-lg font-medium text-slate-700 mb-1">Click to upload CSV</span>
              <span className="text-sm text-slate-400">or drag and drop file here</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
            </label>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <FileText className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">GLT Testimony Analytics</h1>
              <p className="text-xs text-slate-500">{fileData?.length} testimonies loaded</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={view === 'analyze' ? 'primary' : 'ghost'} onClick={() => setView('analyze')}>
              <PieChart size={18} /> Analysis
            </Button>
            <Button variant={view === 'data' ? 'primary' : 'ghost'} onClick={() => setView('data')}>
              <Table size={18} /> Separate Data
            </Button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <Button variant="ghost" onClick={() => { setFileData(null); setView('upload'); }}>
              <X size={18} /> Reset
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        
        {view === 'analyze' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              
              {/* Scan Sources Card */}
              <Card className="p-5 border-indigo-100 bg-indigo-50/50">
                <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <CheckCircle size={16} className="text-indigo-600" /> Active Scan Columns
                </h3>
                <div className="space-y-2">
                   {activeColumns && activeColumns.length > 0 ? (
                     activeColumns.map(col => (
                       <div key={col} className="text-xs bg-white px-2 py-1.5 rounded border border-indigo-100 text-indigo-700 font-medium truncate" title={col}>
                         {col}
                       </div>
                     ))
                   ) : (
                     <p className="text-xs text-slate-500 italic">Scanning all columns (No specific testimony columns found)</p>
                   )}
                </div>
              </Card>

              {/* Time Filter Card */}
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Calendar size={16} /> Time Period
                </h3>
                <div className="space-y-4">
                  <div className="relative">
                    <label className="text-xs text-slate-500 mb-1 block">Date Column</label>
                    <div className="relative">
                        <select 
                        value={dateColumn}
                        onChange={(e) => setDateColumn(e.target.value)}
                        className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8"
                        >
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                  
                  <div className="relative">
                    <label className="text-xs text-slate-500 mb-1 block">Filter Month</label>
                    <div className="relative">
                        <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="w-full appearance-none bg-white border border-indigo-200 text-indigo-900 font-medium text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-3 pr-8 shadow-sm"
                        >
                        <option value="All Time">All Time (Total)</option>
                        {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-3.5 text-indigo-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                  <Filter size={16} /> GLT Categories
                </h3>
                
                <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {rules.map(rule => (
                    <div key={rule.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 relative group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-slate-800 text-sm flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${rule.color.replace('bg-', 'bg-')}`}></span>
                          {rule.name}
                        </span>
                        <button onClick={() => removeRule(rule.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.keywords.slice(0, 8).map(k => (
                          <span key={k} className="bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px]">
                            {k}
                          </span>
                        ))}
                        {rule.keywords.length > 8 && (
                          <span className="text-xs text-slate-400 self-center">+{rule.keywords.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                  <h4 className="text-indigo-800 font-medium text-xs mb-2 uppercase">Add New Category</h4>
                  <input 
                    type="text" 
                    placeholder="Name" 
                    className="w-full text-sm p-2 rounded border border-indigo-200 mb-2 focus:outline-none focus:border-indigo-400"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                  />
                  <input 
                    type="text" 
                    placeholder="Keywords (comma separated)" 
                    className="w-full text-sm p-2 rounded border border-indigo-200 mb-2 focus:outline-none focus:border-indigo-400"
                    value={newRuleKeywords}
                    onChange={(e) => setNewRuleKeywords(e.target.value)}
                  />
                  <Button variant="primary" onClick={addRule} className="w-full justify-center py-1.5 text-xs">
                    <Plus size={14} /> Add Category
                  </Button>
                </div>
              </Card>
            </div>

            <div className="col-span-12 lg:col-span-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard 
                    title="Total Testimonies" 
                    value={analysis?.total} 
                    subtext="All records"
                    icon={FileText} 
                    color="text-indigo-600 bg-indigo-50" 
                />
                <MetricCard 
                  title="Unique Entries" 
                  value={Object.keys(analysis?.distribution || {}).length} 
                  subtext="Duplicates excluded"
                  icon={BarChart2} 
                  color="text-blue-600 bg-blue-50" 
                />
                <MetricCard 
                  title="Categorized" 
                  value={(analysis?.total || 0) - (analysis?.categorization.Others || 0)} 
                  subtext="Matched rules"
                  icon={Filter} 
                  color="text-green-600 bg-green-50" 
                />
                <MetricCard 
                  title="Others" 
                  value={analysis?.categorization.Others} 
                  subtext="Low confidence"
                  icon={Search} 
                  color="text-orange-600 bg-orange-50" 
                />
              </div>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900">Breakdown by Category</h3>
                        <p className="text-xs text-slate-500 mt-1">Showing data for: <span className="font-semibold text-indigo-600">{selectedMonth}</span></p>
                    </div>
                </div>
                
                <div className="space-y-4">
                  {Object.entries(analysis?.categorization || {})
                    .sort((a, b) => b[1] - a[1]) 
                    .map(([name, count]) => {
                    const percentage = analysis?.total ? Math.round((count / analysis.total) * 100) : 0;
                    const isUncat = name === 'Others';
                    const rule = rules.find(r => r.name === name);
                    const barColor = isUncat ? 'bg-slate-300' : (rule?.color.replace('bg-', 'bg-') || 'bg-indigo-600');
                    
                    return (
                      <div key={name} className="relative">
                        <div className="flex justify-between text-sm mb-1 z-10 relative">
                          <span className={`font-medium ${isUncat ? 'text-slate-500 italic' : 'text-slate-700'}`}>{name}</span>
                          <span className="text-slate-600 font-mono">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-8 overflow-hidden relative">
                          <div 
                            className={`h-full ${barColor} opacity-20 absolute top-0 left-0`} 
                            style={{ width: `${percentage}%` }}
                          ></div>
                          <div 
                            className={`h-full ${barColor} w-1 absolute top-0 left-0`} 
                            style={{ left: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Top Recurring Phrases (Selected Column)</h3>
                
                 <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Column for preview:</p>
                    <div className="relative max-w-sm">
                        <select 
                            value={selectedColumn}
                            onChange={(e) => setSelectedColumn(e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2 pr-8"
                        >
                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <ChevronDown className="absolute right-3 top-2.5 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-medium">Text Content (Preview)</th>
                        <th className="px-4 py-3 font-medium text-right">Count</th>
                        <th className="px-4 py-3 font-medium text-right w-32">Freq</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis?.distribution.map(([key, count], idx) => (
                        <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-md truncate" title={key}>{key}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{count}</td>
                          <td className="px-4 py-3">
                            <div className="w-full bg-slate-100 rounded-full h-1.5 ml-auto max-w-[100px]">
                              <div 
                                className="bg-indigo-500 h-1.5 rounded-full" 
                                style={{ width: `${(count / analysis.total) * 100}%` }}
                              ></div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

            </div>
          </div>
        )}

        {view === 'data' && (
          <Card className="overflow-hidden min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-slate-50 space-y-4 md:space-y-0 md:flex md:justify-between md:items-center">
              <div>
                <h3 className="font-bold text-slate-800">Testimony Data</h3>
                <div className="text-xs text-slate-500 mt-1">
                    Showing {filteredData.length} records • <span className="font-medium text-indigo-600">{selectedMonth}</span>
                </div>
              </div>
              
              <div className="flex gap-3">
                  <div className="relative">
                      <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="appearance-none bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-3 pr-8 py-2"
                      >
                        <option value="All">All Categories</option>
                        <option value="Others">Others</option>
                        {rules.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-3 text-slate-400 pointer-events-none" size={14} />
                  </div>
                  
                  <Button variant="primary" onClick={() => exportToCSV(filteredData, headers, `glt_testimonies_${filterCategory.toLowerCase().replace(/ /g, '_')}.csv`)}>
                      <Download size={16} /> Export CSV
                  </Button>
              </div>
            </div>
            
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 font-medium bg-slate-100">Auto Category</th>
                    <th className="px-6 py-3 font-medium bg-slate-100">Month</th>
                    <th className="px-6 py-3 font-medium bg-slate-100">Debug Match</th>
                    {headers.map(h => (
                      <th key={h} className="px-6 py-3 font-medium bg-slate-50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredData.slice(0, 500).map((row, i) => {
                      const rule = rules.find(r => r.name === row.Category);
                      return (
                        <tr key={i} className="hover:bg-slate-50">
                        <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                row.Category === 'Others' 
                                ? 'bg-slate-100 text-slate-800' 
                                : `${rule?.color.replace('bg-', 'bg-') || 'bg-indigo-600'} text-white`
                            }`}>
                                {row.Category}
                            </span>
                        </td>
                        <td className="px-6 py-3 text-slate-500 text-xs">
                             {row.Month_Year || '-'}
                        </td>
                        <td className="px-6 py-3">
                            {row.Matched_Keywords ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-2 py-1 rounded max-w-[150px] truncate" title={row.Matched_Keywords}>
                                    <Tag size={10} /> {row.Matched_Keywords}
                                </span>
                            ) : (
                                <span className="text-[10px] text-slate-300">-</span>
                            )}
                        </td>
                        {headers.map((h, j) => (
                            <td key={j} className="px-6 py-3 text-slate-700 max-w-xs truncate" title={(row as Record<string, string>)[h]}>
                            {(row as Record<string, string>)[h]}
                            </td>
                        ))}
                        </tr>
                      );
                  })}
                </tbody>
              </table>
              {filteredData.length > 500 && (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 border-t border-slate-200">
                      Showing first 500 rows only. Export to see full dataset.
                  </div>
              )}
            </div>
          </Card>
        )}

      </main>
    </div>
  );
}