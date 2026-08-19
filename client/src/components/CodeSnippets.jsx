import { useState } from 'react';
import { Code2, Search } from 'lucide-react';

const SNIPPETS = {
  python: [
    { name: 'Hello World', code: 'print("Hello, World!")' },
    { name: 'Function', code: 'def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("Alice"))' },
    { name: 'Class', code: 'class Person:\n    def __init__(self, name):\n        self.name = name\n    \n    def greet(self):\n        return f"Hi, I\'m {self.name}"\n\np = Person("Bob")\nprint(p.greet())' },
    { name: 'List Comprehension', code: 'numbers = [1, 2, 3, 4, 5]\nsquares = [x**2 for x in numbers]\nprint(squares)' },
  ],
  javascript: [
    { name: 'Hello World', code: 'console.log("Hello, World!");' },
    { name: 'Arrow Function', code: 'const greet = (name) => `Hello, ${name}!`;\nconsole.log(greet("Alice"));' },
    { name: 'Array Methods', code: 'const numbers = [1, 2, 3, 4, 5];\nconst doubled = numbers.map(n => n * 2);\nconsole.log(doubled);' },
    { name: 'Async/Await', code: 'const fetchData = async () => {\n  try {\n    const response = await fetch("https://api.example.com/data");\n    const data = await response.json();\n    console.log(data);\n  } catch (error) {\n    console.error(error);\n  }\n};\nfetchData();' },
  ],
  cpp: [
    { name: 'Hello World', code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}' },
    { name: 'Vector', code: '#include <iostream>\n#include <vector>\nusing namespace std;\n\nint main() {\n    vector<int> v = {1, 2, 3, 4, 5};\n    for (int x : v) cout << x << " ";\n    return 0;\n}' },
  ],
};

export default function CodeSnippets({ language, onInsert }) {
  const [search, setSearch] = useState('');
  const snippets = SNIPPETS[language] || [];
  const filtered = snippets.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="snippets-panel">
      <div className="snippets-header">
        <Code2 size={16} style={{ color: 'var(--accent)' }} />
        <span>Snippets</span>
      </div>
      <div className="snippets-search">
        <Search size={14} />
        <input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div className="snippets-list">
        {filtered.map((s, i) => (
          <div key={i} className="snippet-item" onClick={() => onInsert(s.code)}>
            <div className="snippet-name">{s.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}