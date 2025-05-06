import { useEffect, useState, ChangeEvent, FormEvent } from 'react';

interface MatchDefinition {
  field?: string;
  fields?: string[];
  source: 'body' | 'query';
  cases: Record<string,string>;
  default: string;
}

interface Route {
  method: string;
  path: string;
  response_template: string;
  auth: boolean;
  delay?: number;
  match?: MatchDefinition;
}

const emptyRoute: Route = {
  method: 'GET',
  path: '/new-path',
  response_template: 'new_response.json',
  auth: false,
  delay: 0,
  match: { source:'query', cases:{}, default:'' }
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://mock-server:8080'

export default function Home() {
  const [edited, setEdited] = useState<Route[]>([]);

  useEffect(() => {
    fetch('/api/routes')
      .then(res => res.json())
      .then((data: Route[]) => setEdited(data))
      .catch(console.error);
  }, []);

  const handleChange = (
    index: number,
    key: keyof Route,
    value: string | boolean | number
  ) => {
    const updated = [...edited];
    updated[index] = { ...updated[index], [key]: value } as Route;
    setEdited(updated);
  };


  const handleMatchChange = <K extends keyof MatchDefinition>(
    idx: number, key: K, val: MatchDefinition[K]
  ) => {
    const next = [...edited];
    const prev = next[idx].match ?? { source:'query', cases:{}, default:'' };
    next[idx] = {
      ...next[idx],
      match: { ...prev, [key]: val } as MatchDefinition
    };
    setEdited(next);
  };

  const handleAdd = () => setEdited([...edited, { ...emptyRoute }]);
  const handleDelete = (index: number) => setEdited(edited.filter((_, i) => i !== index));

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edited),
    })
      .then(() => alert('Routes saved!'))
      .catch(console.error);
  };

  const [testOutput, setTestOutput] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const runTests = async () => {
    setRunning(true)
    setTestOutput(null)
    try {
      const res = await fetch('/api/run-dredd')
      const json = await res.json()
      setTestOutput(json.ok ? json.output : `Error:\n${json.error}`)
    } catch (e: any) {
      setTestOutput(`Fetch error:\n${e.message}`)
    } finally {
      setRunning(false)
    }
  }

  return (
    <>
      {/* Drawer Navigation */}
      <nav className="left drawer">
        <a target="_blank" href="https://github.com/aki-mia/mock-works">
          <i>fork_right</i>
          <div>Github</div>
        </a>
        <a target="_blank" href="http://localhost:8080/swagger/">
          <i>api</i>
          <div>Swagger UI</div>
        </a>
        <button className="small-round primary" type="submit" onClick={handleSave}>
          Save All Setting
        </button>
      </nav>
      {/* Main Content */}
      <main className="responsive">
        <h1 className="title">MockWorks API Route Editor</h1>
        <button className="small-round" onClick={handleAdd}>+ Add Route</button>
                      <button
        className="small-round primary"
        onClick={runTests}
        disabled={running}
      >
        {running ? 'Running…' : 'Run API Tests'}
      </button>
        <form>
          {edited.map((r, i) => (
            <article className="card" key={i}>
              <h4 className="subtitle">
                Route #{i + 1}
                <button
                  className="small absolute right small-round error"
                  type="button"
                  onClick={() => handleDelete(i)}
                >
                  Delete
                </button>
              </h4>

              {/* ← ここが基本フィールド */}
              <div className="field border extra">
                <label>
                  Method:
                  <input
                    type="text"
                    value={r.method}
                    onChange={(e) => handleChange(i, 'method', e.target.value)}
                  />
                </label>
                <label>
                  Path:
                  <input
                    type="text"
                    value={r.path}
                    onChange={(e) => handleChange(i, 'path', e.target.value)}
                  />
                </label>
                <label>
                  Template:
                  <input
                    type="text"
                    value={r.response_template}
                    onChange={(e) =>
                      handleChange(i, 'response_template', e.target.value)
                    }
                  />
                </label>
              </div>

              {/* オプション（match, auth, delay） */}
              <details>
                <summary><i>settings</i> Options</summary>

                {/* match.source */}
                <label>
                  Source:
                  <select
                    value={r.match?.source}
                    onChange={(e) =>
                      handleMatchChange(i, 'source', e.target.value as any)
                    }
                  >
                    <option value="query">Query</option>
                    <option value="body">Body</option>
                  </select>
                </label>

                {/* 単一フィールド */}
                <label>
                  Field:
                  <input
                    type="text"
                    value={r.match?.field || ''}
                    onChange={(e) =>
                      handleMatchChange(i, 'field', e.target.value)
                    }
                  />
                </label>

                {/* 複数フィールド */}
                <label>
                  Fields (comma-separated):
                  <input
                    type="text"
                    value={r.match?.fields?.join(',') || ''}
                    onChange={(e) =>
                      handleMatchChange(
                        i,
                        'fields',
                        e.target.value.split(',').map((s) => s.trim())
                      )
                    }
                  />
                </label>

                {/* cases */}
                <label>
                  Cases (key=filename, one per line):
                  <textarea
                    rows={3}
                    value={Object.entries(r.match?.cases || {})
                      .map(([k, v]) => `${k}=${v}`)
                      .join('\n')}
                    onChange={(e) => {
                      const obj: Record<string, string> = {};
                      e.target.value.split('\n').forEach((line) => {
                        const [k, v] = line.split('=');
                        if (k && v) obj[k.trim()] = v.trim();
                      });
                      handleMatchChange(i, 'cases', obj);
                    }}
                  />
                </label>

                {/* default */}
                <label>
                  Default:
                  <input
                    type="text"
                    value={r.match?.default || ''}
                    onChange={(e) =>
                      handleMatchChange(i, 'default', e.target.value)
                    }
                  />
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={r.auth}
                    onChange={(e) => handleChange(i, 'auth', e.target.checked)}
                  />{' '}
                  Auth
                </label>
                <label>
                  Delay (ms):
                  <input
                    type="number"
                    value={r.delay || 0}
                    onChange={(e) =>
                      handleChange(
                        i,
                        'delay',
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                  />
                </label>
              </details>
            </article>
          ))}
        </form>

              {testOutput !== null && (
        <pre className="card" style={{ whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto' }}>
          {testOutput}
        </pre>
      )}
      </main>
    </>
  );
}